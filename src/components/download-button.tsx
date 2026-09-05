"use client";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestDownloadUrl } from "@/services/account";
export function DownloadButton({ productId }: { productId: string }) { return <Button onClick={async () => { const result = await requestDownloadUrl(productId); if (!result.ok) { toast.error(result.error); return; } window.location.assign(result.url); }}><Download /> تحميل</Button>; }
