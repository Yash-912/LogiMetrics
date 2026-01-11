import LeafletHeatmap from "../components/ui/LeafletHeatmap";

export default function AccidentHeatmap() {
    return (
        <div>
            <h2>Accident-Prone Heatmap (Leaflet + OSM)</h2>
            <LeafletHeatmap />
        </div>
    );
}