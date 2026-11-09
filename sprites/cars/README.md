# Custom Car Sprites for HELM'S DEEP

Drop your top-down PNG images here. The engine loads them automatically.

## How to prepare the PNGs:
1. **Background**: Transparent.
2. **Orientation**: The car should be **facing RIGHT (→ East)**.
   The game engine rotates it to match the vehicle's driving direction.
3. **Dimensions / Proportions**:
   - Standard sports car / sedan: ~`88 × 40` px (or `176 × 80` px for high-res 2x).
   - SUV / Van / Ambassador: ~`96 × 44` px.
   - School Bus / Truck: ~`140 × 50` px.
   - Any resolution works — the engine scales it to the car's bounding box!

## File names to try first:
- `porsche.png` (Porsche 911 GT3)
- `lambo.png` (Lamborghini Huracan / Aventador)
- `ambassador.png` (State Ambassador with red beacon)
- `taxi.png` (Kaali-Peeli Mumbai Taxi)
- `auto.png` (Auto-rickshaw)
- `police.png` (Police Cruiser)
- `school-bus.png` (Tata School Bus)
- `garbage-truck.png` (BMC Garbage Truck)
- `tank.png` (Rhino Tank at military base)
- `heli.png` (Combat Chopper at naval base)

See `VEHICLE_NAMES.json` in this folder for every vehicle in the game.
If an image is missing, the game falls back to procedural vector rendering automatically.
