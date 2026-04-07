import { build } from 'vite';

async function runBuild() {
  try {
    await build({
        logLevel: 'error'
    });
    console.log("Build successful");
  } catch (e) {
    console.error("BUILD_ERROR_NAME: ", e.name);
    console.error("BUILD_ERROR_MESSAGE: ", e.message);
    console.error("BUILD_ERROR_STACK: ", e.stack);
  }
}
runBuild();
