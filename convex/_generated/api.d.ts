/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from '../apiKeys.js'
import type * as auth from '../auth.js'
import type * as authManual from '../authManual.js'
import type * as bookmarks from '../bookmarks.js'
import type * as categories from '../categories.js'
import type * as collections from '../collections.js'
import type * as crons from '../crons.js'
import type * as http from '../http.js'
import type * as metadata from '../metadata.js'
import type * as migrate from '../migrate.js'
import type * as pairing from '../pairing.js'
import type * as users from '../users.js'

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference
} from 'convex/server'

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys
  auth: typeof auth
  authManual: typeof authManual
  bookmarks: typeof bookmarks
  categories: typeof categories
  collections: typeof collections
  crons: typeof crons
  http: typeof http
  metadata: typeof metadata
  migrate: typeof migrate
  pairing: typeof pairing
  users: typeof users
}>

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>

export declare const components: {}
