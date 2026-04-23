"use client";

import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/primitives/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/primitives/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";

export function DS1InteractiveShowcase() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DemoCard
        eyebrow="Client"
        title="Select"
        description="Input-matched trigger, mono chevron, and Radix keyboard navigation."
      >
        <div className="space-y-3">
          <Select defaultValue="brokered">
            <SelectTrigger aria-label="Shipment mode">
              <SelectValue placeholder="Choose shipment mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brokered">Brokered load</SelectItem>
              <SelectItem value="contracted">Contract lane</SelectItem>
              <SelectItem value="expedite">Expedite hotshot</SelectItem>
              <SelectItem value="drayage">Port drayage</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger aria-label="Lane status">
              <SelectValue placeholder="Choose lane status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tendered">Tendered</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="pickup">At pickup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DemoCard>

      <DemoCard
        eyebrow="Client"
        title="Tabs"
        description="Underline navigation with amber active bar and mono labels."
      >
        <div className="space-y-5">
          <Tabs defaultValue="northbound">
            <TabsList>
              <TabsTrigger value="northbound">Northbound</TabsTrigger>
              <TabsTrigger value="southbound">Southbound</TabsTrigger>
              <TabsTrigger value="yard">Yard</TabsTrigger>
            </TabsList>
            <TabsContent value="northbound">CHI → DET • 4 tenders • margin +6.2%</TabsContent>
            <TabsContent value="southbound">ATL → JAX • 2 tenders • margin +3.9%</TabsContent>
            <TabsContent value="yard">Memphis drop yard • 11 trailers spotted</TabsContent>
          </Tabs>

          <Tabs defaultValue="exceptions">
            <TabsList>
              <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
              <TabsTrigger value="sla">SLA</TabsTrigger>
            </TabsList>
            <TabsContent value="exceptions">2 late appointments need reroute review.</TabsContent>
            <TabsContent value="sla">96.4% on-time this shift.</TabsContent>
          </Tabs>
        </div>
      </DemoCard>

      <DemoCard
        eyebrow="Client"
        title="Dialog"
        description="Centered modal with a gridded backdrop, amber edge, and lazy-loaded motion."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dispatch Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono text-lg uppercase tracking-[0.18em] text-slate-50">
                Tender Confirmation
              </DialogTitle>
              <DialogDescription className="max-w-md text-sm text-slate-400">
                Confirm dispatch before the appointment window locks. This should remain fully
                keyboard operable and restore focus to the trigger on close.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-3 font-mono text-xs uppercase tracking-[0.14em] text-slate-300">
              <MetricRow label="Load" value="#FM-00421" />
              <MetricRow label="Pickup" value="Chicago, IL · 06:30" />
              <MetricRow label="Rate" value="$3,840" />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Dispatch Load</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DemoCard>

      <DemoCard
        eyebrow="Client"
        title="Drawer"
        description="Right-side operations panel using the same modal foundation with a 240ms slide."
      >
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="secondary">Open Ops Drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-mono text-lg uppercase tracking-[0.18em] text-slate-50">
                Lane Console
              </DrawerTitle>
              <DrawerDescription className="max-w-lg text-sm text-slate-400">
                Review active exceptions, assign coverage, and close with Escape without breaking
                focus flow.
              </DrawerDescription>
            </DrawerHeader>

            <div className="mt-6 space-y-3">
              <div className="fm-panel-muted rounded-lg p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">
                  Priority
                </p>
                <p className="mt-2 font-mono text-sm text-slate-200">
                  2 drivers short on ATL → MIA reefer lane
                </p>
              </div>
              <div className="fm-panel-muted rounded-lg p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">
                  Next Action
                </p>
                <p className="mt-2 font-mono text-sm text-slate-200">
                  Rebroadcast at +$180 and notify carrier desk.
                </p>
              </div>
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost">Dismiss</Button>
              </DrawerClose>
              <Button variant="danger">Escalate</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </DemoCard>
    </div>
  );
}

function DemoCard({
  description,
  eyebrow,
  title,
  children,
}: {
  description: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fm-panel-muted rounded-xl p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p>
      <h3 className="mt-2 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm text-slate-400">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-100">{value}</span>
    </div>
  );
}
