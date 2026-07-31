# vhp (Vue HTML Pages)

`vhp` is the Vue Server Actions CLI Framework. It acts as a meta-framework (similar to Nuxt) that sets up a full-stack Vue environment.

## How it works

`vhp` works in tandem with `vsa` to provide a complete Server-Side Rendering (SSR) and RPC experience out of the box:

- **SSR & SEO Support (`vhp`)**: Under the hood, `vhp` uses **Nitro** and **Vite** to spin up a Node/Edge server. It intercepts requests to your `pages/*.vue` files, compiles them on the server, and returns the fully populated HTML before it hits the browser. This means you get full Server-Side Rendering (SSR) and SEO benefits by default, unlike standard Client-Side Rendered (CSR) Vue.
  
- **Vue Server Actions (`vsa`)**: While `vhp` handles the SSR, it uses the `@rahuldhole/vsa` plugin to allow you to write backend code directly inside a `<script server>` block in your Vue components. These server blocks are automatically converted into API endpoints that you can call securely from your `<script setup>` block.

## Scripts
- `vhp dev --dir <dir>`: Start the development server
- `vhp build --dir <dir>`: Build the application for production
