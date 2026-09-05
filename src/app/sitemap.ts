import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getCategories, getProducts } from "@/services/catalog";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const [categories, products] = await Promise.all([getCategories(), getProducts({ pageSize: 1000 })]); return [{ url: SITE_URL, priority: 1 }, { url: `${SITE_URL}/shop`, priority: 0.9 }, { url: `${SITE_URL}/categories`, priority: 0.8 }, ...categories.map((item) => ({ url: `${SITE_URL}/categories/${item.slug}`, priority: 0.7 })), ...products.products.map((item) => ({ url: `${SITE_URL}/products/${item.slug}`, priority: 0.8 }))]; }
