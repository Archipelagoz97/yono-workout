"use client";
import { useState } from "react";
import { PlusIcon, BuildingIcon, CheckIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { getSelectedGymId, setSelectedGymId } from "@/lib/storage";
import { equipment as equipmentCatalog } from "@/data/equipment";

const CATEGORY_LABELS: Record<string, string> = {
  machine: "Machines",
  cable: "Cables",
  free_weight: "Free weights",
  benches: "Benches & racks",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
  accessory: "Accessories",
};

function equipmentCategories(): Array<{ category: string; label: string; items: typeof equipmentCatalog }> {
  const order = ["machine", "cable", "free_weight", "bodyweight", "cardio", "accessory"];
  const byCat = new Map<string, typeof equipmentCatalog>();
  for (const e of equipmentCatalog) {
    const list = byCat.get(e.category) ?? [];
    list.push(e);
    byCat.set(e.category, list);
  }
  return order
    .filter((c) => byCat.has(c))
    .map((c) => ({ category: c, label: CATEGORY_LABELS[c] ?? c, items: byCat.get(c)! }));
}

export default function GymsPage() {
  const [selectedGymId, setSelectedGymIdState] = useState(() => getSelectedGymId());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGymName, setNewGymName] = useState("");
  const [newGymDesc, setNewGymDesc] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const gyms = useLiveQuery(() => db.gyms.toArray(), []);

  const handleSelect = (id: string) => {
    setSelectedGymId(id);
    setSelectedGymIdState(id);
  };

  const toggleEquipment = (code: string) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleCreateGym = async () => {
    const name = newGymName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const now = Date.now();
      const id = crypto.randomUUID();
      await db.gyms.add({
        id,
        name,
        description: newGymDesc.trim() || undefined,
        equipmentCodes: [...selectedEquipment],
        unavailableEquipmentCodes: [],
        isDefault: false,
        isPreset: false,
        createdAt: now,
        updatedAt: now,
      });
      handleSelect(id);
      setShowAddDialog(false);
      setNewGymName("");
      setNewGymDesc("");
      setSelectedEquipment(new Set());
    } finally {
      setIsCreating(false);
    }
  };

  const categorySections = equipmentCategories();

  return (
    <div className="min-h-dvh yono-gradient content-with-nav">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Gyms</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select your gym to filter exercises by available equipment.
        </p>
      </div>

      <div className="px-4 space-y-3">
        {!gyms && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 skeleton rounded-2xl" />
            ))}
          </div>
        )}
        {gyms?.map((gym) => (
          <Card
            key={gym.id}
            onClick={() => handleSelect(gym.id)}
            className={`p-4 cursor-pointer transition-all ${
              selectedGymId === gym.id
                ? "border-2 border-primary bg-primary/5"
                : "hover:border-primary/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground">{gym.name}</p>
                  {selectedGymId === gym.id && (
                    <Badge className="text-xs gap-1">
                      <CheckIcon className="w-3 h-3" />
                      Active
                    </Badge>
                  )}
                  {gym.isPreset && (
                    <Badge variant="outline" className="text-xs">Preset</Badge>
                  )}
                </div>
                {gym.description && (
                  <p className="text-xs text-muted-foreground">{gym.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {gym.equipmentCodes.length} equipment pieces
                  {gym.unavailableEquipmentCodes && gym.unavailableEquipmentCodes.length > 0 && (
                    <span className="text-amber-600 ml-1">
                      · {gym.unavailableEquipmentCodes.length} unavailable
                    </span>
                  )}
                </p>
              </div>
              <BuildingIcon className="w-5 h-5 text-muted-foreground shrink-0 ml-2" />
            </div>
          </Card>
        ))}

        <Button
          id="btn-add-gym"
          variant="outline"
          className="w-full rounded-xl border-dashed"
          onClick={() => setShowAddDialog(true)}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add custom gym
        </Button>
      </div>

      {/* Add custom gym dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="p-5 pb-3 border-b border-border">
            <DialogTitle>Add custom gym</DialogTitle>
            <DialogDescription>
              Name your gym and select the equipment it has. This keeps Yono&apos;s
              suggestions realistic.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <Label htmlFor="gym-name" className="text-xs text-muted-foreground">
                Gym name
              </Label>
              <Input
                id="gym-name"
                value={newGymName}
                onChange={(e) => setNewGymName(e.target.value)}
                placeholder="e.g. Downtown Fitness"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="gym-desc" className="text-xs text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                id="gym-desc"
                value={newGymDesc}
                onChange={(e) => setNewGymDesc(e.target.value)}
                placeholder="e.g. Compact gym with limited free weights"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground block mb-2">
                Available equipment{" "}
                <span className="text-muted-foreground/70">
                  ({selectedEquipment.size} selected)
                </span>
              </Label>
              <div className="space-y-3">
                {categorySections.map(({ category, label, items }) => (
                  <div key={category}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item) => {
                        const selected = selectedEquipment.has(item.code);
                        return (
                          <button
                            key={item.code}
                            onClick={() => toggleEquipment(item.code)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <Button
              id="btn-confirm-add-gym"
              onClick={handleCreateGym}
              disabled={!newGymName.trim() || isCreating}
              className="w-full h-11 rounded-xl font-semibold"
            >
              {isCreating ? "Creating..." : "Add gym"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
