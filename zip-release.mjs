
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const PLUGIN_ID = 'previous-river';

async function main() {
    // 1. Get git commit hash
    let commitHash;
    try {
        commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
        console.warn('Failed to get git commit hash. Using "dev".');
        commitHash = 'dev';
    }

    // 2. Build the project
    console.log('Building project...');
    try {
        execSync('npm run build', { stdio: 'inherit' });
    } catch (e) {
        console.error('Build failed.');
        process.exit(1);
    }

    // 3. Prepare temporary directory for zip
    const buildDir = 'build'; // 'build' directory created by npm run build (esbuild)
    const zipName = `${PLUGIN_ID}-${commitHash}.zip`;

    // Create a stream to write the zip
    const output = fs.createWriteStream(zipName);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    output.on('close', function () {
        console.log(`${zipName} created (${archive.pointer()} total bytes)`);
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);

    // 4. Add files to the zip
    // Structure: previous-river/
    //              main.js
    //              manifest.json
    //              styles.css (if exists)

    const prefix = `${PLUGIN_ID}/`;

    // Add main.js from build directory (it is compiled to build/main.js by esbuild script in package.json)
    // Wait, package.json says: "esbuild main.ts --bundle --outdir=build"
    // So main.js is in build/main.js
    if (fs.existsSync(path.join(buildDir, 'main.js'))) {
        archive.file(path.join(buildDir, 'main.js'), { name: `${prefix}main.js` });
    } else {
        console.error(`Error: ${buildDir}/main.js not found. Build might have failed.`);
        process.exit(1);
    }

    // Add manifest.json
    if (fs.existsSync('manifest.json')) {
        archive.file('manifest.json', { name: `${prefix}manifest.json` });
    } else {
        console.error('Error: manifest.json not found.');
        process.exit(1);
    }

    // Add styles.css
    if (fs.existsSync('styles.css')) {
        archive.file('styles.css', { name: `${prefix}styles.css` });
    } else {
        console.warn('styles.css not found, skipping.');
    }

    // Finalize the zip
    await archive.finalize();
}

main().catch(console.error);
