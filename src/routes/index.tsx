import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestForm } from "@/components/RequestForm";
import { RequestRecords } from "@/components/RequestRecords";
import { Toaster } from "@/components/ui/sonner";
import { Package } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "物料申请管理 — 后台模块" },
      { name: "description", content: "物料领用、退还、转移流程申请与记录查询" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">物料申请管理</h1>
            <p className="text-xs text-muted-foreground">领用 / 退还 / 转移 流程与记录</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="records" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
            <TabsTrigger value="records">申请记录</TabsTrigger>
            <TabsTrigger value="lingyong">领用出库</TabsTrigger>
            <TabsTrigger value="tuihuan">退还处理</TabsTrigger>
            <TabsTrigger value="zhuanyi">物料转移</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <RequestRecords />
          </TabsContent>
          <TabsContent value="lingyong">
            <RequestForm flowType="lingyong" />
          </TabsContent>
          <TabsContent value="tuihuan">
            <RequestForm flowType="tuihuan" />
          </TabsContent>
          <TabsContent value="zhuanyi">
            <RequestForm flowType="zhuanyi" />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
