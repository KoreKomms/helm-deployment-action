import { GithubDto } from './github.value.dto';
import { HelmVariableDto } from './helm.variable.dto';

const dryRun = process.env.DRY_RUN;
const name = process.env.NAME;
const helmChartUrl = process.env.HELM_CHART_URL;
const namespace = process.env.NAMESPACE;
const secrets: { [key: string]: string } = JSON.parse(process.env.GITHUB_SECRETS ?? '{}');
const variables: { [key: string]: string } = JSON.parse(process.env.GITHUB_VARIABLES ?? '{}');
const prefix = process.env.GITHUB_SECRET_VARIABLE_PREFIX;
const environment = process.env.DEPLOYMENT_ENVIRONMENT;
const helmConfigMapVariableName = process.env.HELM_CONFIG_MAP_VARIABLE_NAME;
const helmSecretVariableName = process.env.HELM_SECRET_VARIABLE_NAME;
const tag = process.env.TAG;

let helmDeploymentCommand = 'helm --kubeconfig .kubeConfig upgrade \\\n' + '  --install \\\n' + '  --create-namespace \\\n' + `  --namespace ${namespace} \\\n` + `  --set image.tag=${tag} \\\n`;

if (dryRun) {
  console.log('Executing Dry Run...');
}

const helmSecrets: Array<HelmVariableDto> = [];
const helmConfigMaps: Array<HelmVariableDto> = [];

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
        helmSecrets.push({ key: varValue.key, value: varValue.value });
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
        helmConfigMaps.push({ key: varValue.key, value: varValue.value });
      }
    } catch (e: unknown) {
      console.error(`Misconfigured Github Variable: ${variableName}. Please correct and re-run.`);
      throw e;
    }
  }
});

helmSecrets.forEach((dto, idx) => {
  helmDeploymentCommand = helmDeploymentCommand.concat(`  --set ${helmSecretVariableName}[${idx}].key='${dto.key}' \\\n`);
  helmDeploymentCommand = helmDeploymentCommand.concat(`  --set ${helmSecretVariableName}[${idx}].value='${dryRun ? '<REDACTED>' : dto.value}' \\\n`);
});

helmConfigMaps.forEach((dto, idx) => {
  helmDeploymentCommand = helmDeploymentCommand.concat(`  --set ${helmConfigMapVariableName}[${idx}].key='${dto.key}' \\\n`);
  helmDeploymentCommand = helmDeploymentCommand.concat(`  --set ${helmConfigMapVariableName}[${idx}].value='${dryRun ? '<REDACTED>' : dto.value}' \\\n`);
});

helmDeploymentCommand = helmDeploymentCommand.concat('  '.concat(helmChartUrl));

if (dryRun) {
  console.log(`This is a Dry Run. Install command to be run - ${helmDeploymentCommand}`);
}

console.log(helmDeploymentCommand);
