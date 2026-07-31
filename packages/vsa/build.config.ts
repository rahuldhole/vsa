import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/module'
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true
  }
})
