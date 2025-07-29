import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve          from '@rollup/plugin-node-resolve';
import commonjs         from '@rollup/plugin-commonjs';
import typescript       from '@rollup/plugin-typescript';

// -----------------------------------------------------------------------------
//  Rollup configuration
//  – Builds ./src/index.ts → dist/index.js (CJS) and dist/index.esm.js (ESM)
//  – Emits declaration files alongside the JS bundles
//  – Marks React and React-DOM as externals so they’re not bundled
// -----------------------------------------------------------------------------

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',      // CommonJS bundle (package.json "main")
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',  // ES-module bundle (package.json "module")
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({ extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'] }),
    commonjs(),
    typescript({
      tsconfig: false,            // we override compiler options below
      compilerOptions: {
        module: 'ESNext',         // <-- ensure ESM output (avoids `require`)
        target: 'ES2018',
        declaration: true,
        declarationDir: 'dist',
        sourceMap: true,
        jsx: 'react-jsx',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
    }),
  ],
  external: ['react', 'react-dom'],
}; 