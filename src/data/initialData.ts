import type { Block } from "../types/block";

export const initialLibrary: Block[] = [
  {
    id: "block-1",
    name: "Create Session",
    method: "POST",
    path: "/api/session",
    description: "POST /api/session",
    responseTemplate: "",
    responseHeaders: {},
    templateValues: [],
  },
  {
    id: "block-2",
    name: "Get Catalog",
    method: "GET",
    path: "/api/catalog",
    description: "GET /api/catalog",
    responseTemplate: "",
    responseHeaders: {},
    templateValues: [],
  },
  {
    id: "block-3",
    name: "Update Cart",
    method: "PATCH",
    path: "/api/cart",
    description: "PATCH /api/cart",
    responseTemplate: "",
    responseHeaders: {},
    templateValues: [],
  },
  {
    id: "block-4",
    name: "Checkout",
    method: "POST",
    path: "/api/checkout",
    description: "POST /api/checkout",
    responseTemplate: "",
    responseHeaders: {},
    templateValues: [],
  },
];
