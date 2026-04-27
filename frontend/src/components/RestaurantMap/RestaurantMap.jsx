import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MINSK_CENTER = [53.9045, 27.5615];

const RestaurantMap = ({ restaurants }) => {
  const withCoords = restaurants.filter((r) => r.latitude && r.longitude);

  return (
    <MapContainer center={MINSK_CENTER} zoom={12} style={{ height: '500px', width: '100%', borderRadius: '8px', marginTop: '1rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((r) => (
        <Marker key={r.id} position={[r.latitude, r.longitude]}>
          <Popup>
            <strong>{r.name}</strong>
            <br />
            {r.cuisine}
            <br />
            {r.address}
            <br />
            <Link to={`/restaurants/${r.id}`}>Подробнее</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default RestaurantMap;
