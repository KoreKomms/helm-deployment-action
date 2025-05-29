import { execSync } from 'child_process';
import { GithubDto } from './github.value.dto';
import { HelmEnvVarDto } from './helm.env.var.dto';
import { HelmVariableDto } from './helm.variable.dto';

const dryRun = process.env.DRY_RUN === 'true';
const name = process.env.NAME;
const helmChartUrl = process.env.HELM_CHART_URL;
const helmChartVersion = process.env.HELM_CHART_VERSION;
const namespace = process.env.NAMESPACE;
const secrets: { [key: string]: string } = JSON.parse(process.env.GITHUB_SECRETS || '{}');
const variables: { [key: string]: string } = JSON.parse(process.env.GITHUB_VARIABLES || '{}');
const environmentVariables: { [key: string]: string } = JSON.parse(process.env.ENVIRONMENT_VARIABLES || '{}');
const prefix = process.env.GITHUB_SECRET_VARIABLE_PREFIX;
const environment = process.env.DEPLOYMENT_ENVIRONMENT;
const helmConfigMapVariableName = process.env.HELM_CONFIG_MAP_VARIABLE_NAME;
const helmSecretVariableName = process.env.HELM_SECRET_VARIABLE_NAME;
const helmEnvVarVariableName = process.env.HELM_ENV_VAR_VARIABLE_NAME;
const tag = process.env.TAG;

let helmDeploymentCommand = `helm --kubeconfig .kubeConfig --kube-context ${environment} upgrade ${name} ${dryRun ? '\\\n  ' : ''}--install ${dryRun ? '\\\n  ' : ''}--create-namespace ${dryRun ? '\\\n  ' : ''}--namespace ${namespace} ${dryRun ? '\\\n  ' : ''}--set image.tag=${tag} ${dryRun ? '\\\n  ' : ''}`;

if (dryRun) {
  console.log('Executing Dry Run...');
}

const helmSecrets: Array<HelmVariableDto> = [];
const helmConfigMaps: Array<HelmVariableDto> = [];
const helmEnvVars: Array<HelmEnvVarDto> = [];

if (!helmChartUrl) {
  throw new Error('Misconfigured action. Helm chart URL is missing.');
}

Object.keys(secrets).forEach((secretName) => {
  if (secretName.startsWith(`DEPLOYMENT_${prefix ? prefix.concat('_') : ''}${environment ? environment.concat('_') : ''}`)) {
    try {
      const varValue = JSON.parse(secrets[secretName]) as GithubDto;
      if (varValue.chart === name) {
        if (dryRun) {
          console.log(`Configuring secret with key: ${secretName}`);
        }
        helmSecrets.push({ key: varValue.key, value: varValue.value.replace(',', '\\,') });
      }
    } catch (e: unknown) {
      console.error(`Misconfigured Github Secret: ${secretName}. Please correct and re-run.`);
      throw e;
    }
  }
});

Object.keys(variables).forEach((variableName) => {
  if (variableName.startsWith(`DEPLOYMENT_${prefix ? prefix.concat('_') : ''}${environment ? environment.concat('_') : ''}`)) {
    try {
      const varValue = JSON.parse(variables[variableName]) as GithubDto;
      if (varValue.chart === name) {
        if (dryRun) {
          console.log(`Configuring Variable with key: ${variableName}`);
        }
        helmConfigMaps.push({ key: varValue.key, value: varValue.value.replace(',', '\\,') });
      }
    } catch (e: unknown) {
      console.error(`Misconfigured Github Variable: ${variableName}. Please correct and re-run.`);
      throw e;
    }
  }
});

Object.keys(environmentVariables).forEach((environmentVariableName) => helmEnvVars.push({ name: environmentVariableName, value: environmentVariables[environmentVariableName].replace(',', '\\,') }));

helmSecrets.forEach((dto, idx) => {
  helmDeploymentCommand = helmDeploymentCommand.concat(`--set ${helmSecretVariableName}[${idx}].key='${dto.key}' ${dryRun ? '\\\n  ' : ''}`);
  helmDeploymentCommand = helmDeploymentCommand.concat(`--set ${helmSecretVariableName}[${idx}].value='${dryRun ? '<REDACTED>' : dto.value}' ${dryRun ? '\\\n  ' : ''}`);
});

helmConfigMaps.forEach((dto, idx) => {
  helmDeploymentCommand = helmDeploymentCommand.concat(`--set ${helmConfigMapVariableName}[${idx}].key='${dto.key}' ${dryRun ? '\\\n  ' : ''}`);
  helmDeploymentCommand = helmDeploymentCommand.concat(`--set ${helmConfigMapVariableName}[${idx}].value='${dryRun ? '<REDACTED>' : dto.value}' ${dryRun ? '\\\n  ' : ''}`);
});

helmEnvVars.forEach((dto, idx) => {
  helmDeploymentCommand = helmDeploymentCommand.concat(`--set ${helmEnvVarVariableName}[${idx}].name='${dto.name}' ${dryRun ? '\\\n  ' : ''}`);
  helmDeploymentCommand = helmDeploymentCommand.concat(`--set ${helmEnvVarVariableName}[${idx}].value='${dto.value}' ${dryRun ? '\\\n  ' : ''}`);
});

if (helmChartVersion) {
  helmDeploymentCommand = helmDeploymentCommand.concat(`--version ${helmChartVersion} ${dryRun ? '\\\n  ' : ''}`);
}

helmDeploymentCommand = helmDeploymentCommand.concat(helmChartUrl);

if (dryRun) {
  console.log(`This is a Dry Run. Install command to be run: ${helmDeploymentCommand}`);
} else {
  execSync(helmDeploymentCommand);
}
