// Builds the native plugin and copies it to native.apk, where manifest.native.apk points
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const native = path.join(root, 'native');
const windows = process.platform === 'win32';

execFileSync(path.join(native, windows ? 'gradlew.bat' : 'gradlew'), [':app:assembleDebug'], { cwd: native, stdio: 'inherit', shell: windows });
copyFileSync(path.join(native, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), path.join(root, 'native.apk'));
console.log('[animated-artwork] native.apk updated');
