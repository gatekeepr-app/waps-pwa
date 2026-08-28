import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Waps',
    version: '1.0.0',
    description: 'Save bookmarks to your Waps account',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['https://*.convex.cloud/*', 'https://*.convex.site/*'],
    action: {
      default_icon: {
        '16': '/icon-16.png',
        '48': '/icon-48.png',
        '128': '/icon-128.png'
      }
    },
    icons: {
      '16': '/icon-16.png',
      '48': '/icon-48.png',
      '128': '/icon-128.png',
      '512': '/icon-512.png'
    }
  }
})
