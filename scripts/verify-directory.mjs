import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const { chromium, firefox, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const out=process.env.EVIDENCE_DIR || '.directory-evidence', origin=process.env.MCP_ORIGIN || 'http://127.0.0.1:4188';
await fs.mkdir(out, { recursive: true });
const report={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),feedHead:process.env.FEED_HEAD || 'not supplied',browsers:{},screenshots:[],checks:[]};
const sourceResponse=await fetch(process.env.ACCOUNTANTS_FEED_URL || 'http://127.0.0.1:4189/api/feed/accountants.json');
assert.equal(sourceResponse.status,200);const source=await sourceResponse.json();assert.equal(source._meta.complete,true);assert.equal(source._meta.dataSource,'live');
report.source={count:source.firms.length,meta:source._meta};
const list=await (await fetch(`${origin}/api/accountants.json?pageSize=2`)).json();assert.equal(list.total,source.firms.length);assert.equal(list.status,'live');
const seen=[];let page=1;
while(page!==null){const result=await(await fetch(`${origin}/api/accountants.json?pageSize=2&page=${page}`)).json();seen.push(...result.firms);page=result.nextPage;}
assert.deepEqual(seen.map(f=>f.slug).sort(),source.firms.map(f=>f.slug).sort());
for(const firm of source.firms){const result=await(await fetch(`${origin}/api/accountants/${firm.slug}.json`)).json();assert.deepEqual(Object.keys(result.firm).sort(),Object.keys(firm).sort());assert.deepEqual(result.firm,firm);}
for(const path of ['/api/accountants.json?page=0','/api/accountants.json?acceptingClients=banana','/api/catalog.json?pageSize=101','/api/catalog.json?page=1&page=2'])assert.equal((await fetch(origin+path)).status,400,path);
assert.equal((await fetch(`${origin}/api/accountants/not-a-published-firm.json`)).status,404);
assert.equal((await fetch(`${origin}/api/catalog.json?id=missing`)).status,404);
report.checks.push('Every published source profile returned with identical full field values, pagination complete, invalid inputs400 and absent IDs404');
const catalog=await(await fetch(`${origin}/api/catalog.json`)).json();assert.equal(catalog.counts.accounting,491);assert.equal(catalog.counts.mcp,32);report.catalog=catalog.counts;
for(const engine of [chromium,firefox,webkit]){
 let browser;
 try{browser=await engine.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:960},reducedMotion:'reduce'});const page=await context.newPage();
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Accountants',exact:true}).click();
 assert.equal(new URL(page.url()).pathname,'/accountants');assert.equal(await page.getByLabel('Availability').locator('option').count(),3);assert.equal(await page.locator('.grid article').count(),source.firms.length);
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:960});for(const path of ['/accountants','/apis']){await page.goto(origin+path,{waitUntil:'domcontentloaded'});const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dims.scroll<=dims.width,`${engine.name()} ${path} ${width} overflow`);assert.ok(await page.getByRole('heading',{level:1}).isVisible());if(engine===chromium&&width!==320){const image=`${out}/${path.slice(1)}-${width}.png`;await page.screenshot({path:image});report.screenshots.push(image);}}}
 await page.setViewportSize({width:1280,height:960});await page.goto(origin+'/accountants');await page.getByLabel('Search',{exact:true}).fill(source.firms[0].firm_name);await page.getByRole('button',{name:'Search directory'}).click();assert.equal(await page.locator('.grid article').count(),1);await page.getByRole('link',{name:'View full profile',exact:true}).click();assert.ok(await page.getByRole('heading',{name:source.firms[0].firm_name,exact:true}).isVisible());assert.ok(await page.getByRole('heading',{name:'Full published profile'}).isVisible());
 const profileHref=await page.getByRole('link',{name:'Full profile JSON'}).getAttribute('href');assert.equal((await context.request.get(origin+profileHref)).status(),200);
 await page.goto(origin+'/apis');assert.equal(await page.getByLabel('API type').locator('option').count(),4);await page.getByLabel('Search APIs',{exact:true}).fill('Create invoice');await page.getByLabel('API type').selectOption('accounting');await page.getByRole('button',{name:'Search APIs'}).click();
 const invoice=page.locator('article').filter({has:page.getByRole('heading',{name:'Create invoice record(s)',exact:true})});assert.equal(await invoice.count(),1);await invoice.getByRole('link',{name:'Parameters & examples'}).click();assert.ok(await page.getByRole('heading',{name:'Request example'}).isVisible());assert.ok((await page.locator('body').innerText()).includes('sales:write'));const docs=page.getByRole('link',{name:'Documentation',exact:true});assert.equal(await docs.getAttribute('href'),'https://developer.hellobooks.ai/docs/reference-sales?resource=invoice&op=2');
 for(const width of [390,320]){await page.setViewportSize({width,height:960});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));}
 await page.goto(origin+'/accountants?pageSize=2');await page.getByRole('navigation',{name:'Directory pages'}).getByRole('link',{name:'Next'}).click();assert.ok(page.url().includes('page=2'));assert.equal(await page.locator('.grid article').count(),2);
 report.browsers[engine.name()]='pass';await context.close();
 }catch(e){report.browsers[engine.name()]='fail';report.checks.push({browser:engine.name(),error:e.stack});}
 finally{await browser?.close();await fs.writeFile(`${out}/browser.json`,JSON.stringify(report,null,2));}
 console.log(engine.name(),report.browsers[engine.name()]);
}
const client=new Client({name:'directory-verification',version:'1.0.0'});
try{await client.connect(new StreamableHTTPClientTransport(new URL(origin+'/mcp')));const tools=await client.listTools();assert.equal(tools.tools.length,32);for(const [name,args] of [['list_accountants',{pageSize:2}],['get_accountant',{slug:source.firms[0].slug}],['list_api_catalog',{kind:'accounting',pageSize:100}]]){const response=await client.callTool({name,arguments:args});assert.ok(!response.isError);const data=JSON.parse(response.content[0].text);assert.ok(Object.keys(data).length>1);if(name==='list_accountants')assert.equal(data.total,source.firms.length);if(name==='get_accountant')assert.equal(data.firm.slug,source.firms[0].slug);if(name==='list_api_catalog')assert.equal(data.total,491);report.checks.push(`Real HTTP MCP call ${name} returned complete structured data`);}}finally{await client.close()}
await fs.writeFile(`${out}/browser.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({browsers:report.browsers,source:report.source,catalog:report.catalog}));if(Object.values(report.browsers).some(x=>x!=='pass'))process.exitCode=1;
