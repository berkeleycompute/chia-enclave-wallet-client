import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve          from '@rollup/plugin-node-resolve';
import commonjs         from '@rollup/plugin-commonjs';
import typescript       from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',         // 🔑 entry file of your library
  output: [
    {
      file: 'dist/index.js',     // CommonJS bundle ← package.json "main"
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js', // ES-module bundle ← package.json "module"
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),          // mark peer deps (react, etc.) as external
    resolve({                   // so Rollup can find node_modules
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      sourceMap: true,
    }),
  ],
  external: ['react', 'react-dom'], // don’t bundle react, etc.
}; 