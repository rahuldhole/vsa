# vsa (Vue Server Actions)

An experimental plugin for Vue Server Actions via `<script server>` blocks. This module allows you to define server-only logic directly in your Vue components. The compiler automatically converts the exports from the server block into reactive RPC actions!

## Development

This project uses [Task](https://taskfile.dev/) as a task runner. Alternatively, you can use `npm run <script>`.

### Available Tasks

- `task dev`: Start the playground development server
- `task build`: Build the Nuxt module
- `task lint`: Run ESLint

For more tasks, inspect the `Taskfile.yml` or `package.json`.
