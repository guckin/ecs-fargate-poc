import esbuild from 'esbuild'

await esbuild.build({
    entryPoints: ['src/rest-api/server.ts'],
    bundle: true,
    packages: "bundle",
    outfile: 'bundle/server.mjs',
    target: 'node20',
    platform: 'node',
    format: 'esm',
    minify: true,
    treeShaking: true,
    sourcemap: true,

})
