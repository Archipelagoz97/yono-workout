"use client";
import { useState } from "react";
import { PlusIcon, BuildingIcon, CheckIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { getSelectedGymId, setSelectedGymId } from "@/lib/storage";

export default function GymsPage() {
  const [selectedGymId, setSelectedGymIdState] = useState(() => getSelectedGymId());
  const gyms = useLiveQuery(() => db.gyms.toArray(), []);

  const handleSelect = (id: string) => {
    setSelectedGymId(id);
    setSelectedGymIdState(id);
  };

  return (
    <div className="min-h-screen yono-gradient content-with-nav">
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
          disabled
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add custom gym (coming soon)
        </Button>
      </div>
    </div>
  );
}
