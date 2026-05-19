// Jenkinsfile — pipeline-as-code for hellobooks-mcp-public.
//
// Why this file exists:
//   The SonarQube quality gate failed with 0% coverage because the
//   previous inline-UI pipeline ran `sonar-scanner` without first
//   producing `coverage/lcov.info`. The Install & Coverage stage
//   below fixes that.  Checking the pipeline in to the repo also
//   means future drift gets caught in code review.
//
// How to use:
//   In the Jenkins job (mcp-hellobooks) Configure page, switch
//   "Definition" from "Pipeline script" to
//   "Pipeline script from SCM" and point it at this file on `main`.
//
// REQUIRED Jenkins-side configuration (one-time, not in this PR):
//   - A Node.js 20+ tool installation named NODE20 (Manage Jenkins →
//     Tools → NodeJS installations). If your tool has a different
//     name, change NODE_TOOL below.
//   - A SonarQube server registered under "sonarqube-local" (Manage
//     Jenkins → System → SonarQube servers). If yours is named
//     differently, change SONARQUBE_SERVER below.
//   - The existing Docker Hub credentials, deploy SSH key, and .env
//     credential bindings used by the current inline pipeline.
//     Re-use the same IDs in the TODOs below — I did not have
//     visibility into the existing inline script, so any stage marked
//     `TODO` must be reconciled with what the inline pipeline does
//     before you flip the job over to SCM mode.
//
// Trunk: main.

pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
  }

  tools {
    nodejs 'NODE20'
  }

  environment {
    SONARQUBE_SERVER = 'sonarqube-local'
    IMAGE_NAME       = 'hellobooks-mcp-public'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    // ── Install dependencies AND produce coverage/lcov.info.
    //    This is the stage that was missing — without it, SonarQube
    //    sees zero coverage and the gate fails on the ≥80% rule.
    stage('Install & Coverage') {
      steps {
        sh 'node --version'
        sh 'npm ci --no-audit --no-fund'
        sh 'npm run lint'
        sh 'npm run test:coverage'
      }
      post {
        always {
          // Surface the lcov summary in the build log so failed
          // coverage runs are visible at a glance.
          sh 'test -f coverage/lcov.info && wc -l coverage/lcov.info || echo "lcov.info missing"'
        }
      }
    }

    stage('SonarQube Quality Analysis') {
      steps {
        withSonarQubeEnv("${SONARQUBE_SERVER}") {
          // sonar-project.properties at the repo root drives the
          // scanner — projectKey=seo-mcp-hellobooks, sources=src,
          // tests=test, lcov path=coverage/lcov.info.
          sh 'sonar-scanner'
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        // Multi-stage build defined in /Dockerfile. Tags both the
        // build number and `latest` so the existing push stage can
        // pick whichever the deploy step expects.
        sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
      }
    }

    // TODO: Reconcile with the existing inline pipeline before SCM cutover.
    // The inline job currently pushes to Docker Hub under credentials I
    // don't have visibility into. Replace `<dockerhub-creds-id>` and
    // `<dockerhub-namespace>` with the real values, then uncomment.
    /*
    stage('Push to Dockerhub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: '<dockerhub-creds-id>',
          usernameVariable: 'DOCKERHUB_USER',
          passwordVariable: 'DOCKERHUB_PASS'
        )]) {
          sh '''
            echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin
            docker tag ${IMAGE_NAME}:${BUILD_NUMBER} <dockerhub-namespace>/${IMAGE_NAME}:${BUILD_NUMBER}
            docker tag ${IMAGE_NAME}:latest         <dockerhub-namespace>/${IMAGE_NAME}:latest
            docker push <dockerhub-namespace>/${IMAGE_NAME}:${BUILD_NUMBER}
            docker push <dockerhub-namespace>/${IMAGE_NAME}:latest
          '''
        }
      }
    }
    */

    // TODO: Reconcile with the existing inline pipeline. The inline
    // job has a "Setup .env" stage — likely a Jenkins `withCredentials`
    // file binding. Fill in the credential ID and target path.
    /*
    stage('Setup .env') {
      steps {
        withCredentials([file(credentialsId: '<env-file-creds-id>', variable: 'ENV_FILE')]) {
          sh 'cp "$ENV_FILE" deploy/.env'
        }
      }
    }
    */

    // TODO: Reconcile with the existing inline pipeline. The inline
    // job has a "Deploy Container" stage — replace this stub with
    // whatever command the inline pipeline currently runs (likely
    // `docker compose up -d` over SSH to the deploy host).
    /*
    stage('Deploy Container') {
      steps {
        sshagent (credentials: ['<deploy-ssh-key-id>']) {
          sh '''
            ssh -o StrictHostKeyChecking=no <deploy-user>@<deploy-host> \\
              "cd <deploy-dir> && docker compose pull && docker compose up -d"
          '''
        }
      }
    }
    */
  }

  post {
    always {
      // Mirror the existing inline pipeline's "Declarative: Post Actions".
      cleanWs()
    }
    failure {
      echo "Pipeline failed at stage: ${env.STAGE_NAME}"
    }
  }
}
