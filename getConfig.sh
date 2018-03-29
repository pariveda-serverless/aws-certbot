#!/bin/bash
aws cloudformation list-exports --query 'Exports[?Name==`aws-certbot-security-'"$STAGE"'`].Value' --output text > rolearn.txt
aws cloudformation list-exports --query 'Exports[?Name==`aws-certbot-security-secrets-'"$STAGE"'`].Value' --output text > s3.txt
aws codepipeline --region $AWS_REGION get-pipeline-state --name $PIPELINE | jq -r '.stageStates[0].actionStates[0].currentRevision.revisionId' > securityhash.txt
aws codepipeline --region $AWS_REGION get-pipeline-state --name $PIPELINE | jq -r '.stageStates[0].actionStates[1].currentRevision.revisionId' > apphash.txt
