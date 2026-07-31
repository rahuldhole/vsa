import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/cli'
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  externals: ['vite', 'citty', '@vitejs/plugin-vue', 'vue', '@rahuldhole/vsa'],
  rollup: {
    emitCJS: true
  }
})
