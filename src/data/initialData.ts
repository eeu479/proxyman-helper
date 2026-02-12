import type { Block } from "../types/block";

export const initialLibrary: Block[] = [
  {
    id: "block-1",
    name: "Create Session",
    method: "POST",
    description: "POST /api/session",
    responseTemplate: "",
    templateValues: [],
  },
  {
    id: "block-2",
    name: "Get Catalog",
    method: "GET",
    description: "GET /api/catalog",
    responseTemplate: "",
    templateValues: [],
  },
  {
    id: "block-3",
    name: "Update Cart",
    method: "PATCH",
    description: "PATCH /api/cart",
    responseTemplate: "",
    templateValues: [],
  },
  {
    id: "block-4",
    name: "Checkout",
    method: "POST",
    description: "POST /api/checkout",
    responseTemplate: "",
    templateValues: [],
  },
];
