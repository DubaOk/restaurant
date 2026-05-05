const geoService = require('./geo.service');

const suggest = async (req, res, next) => {
  try {
    const text = String(req.query.text || '').slice(0, 200);
    if (!text.trim()) return res.json({ success: true, data: [] });
    const city = String(req.query.city || 'Минск').slice(0, 80);
    let bias = null;
    const ll = req.query.ll;
    if (ll && typeof ll === 'string') {
      const parts = ll.split(',').map((x) => Number(String(x).trim()));
      if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        bias = { lon: parts[0], lat: parts[1] };
      }
    }
    const suggestions = await geoService.suggest(text, city, bias);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
};

const geocode = async (req, res, next) => {
  try {
    const address = String(req.query.address || '').slice(0, 400);
    if (!address.trim()) return res.json({ success: true, data: null });
    const result = await geoService.geocodeForward(address);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const reverse = async (req, res, next) => {
  try {
    if (req.query.lat == null || req.query.lng == null) {
      return res.json({ success: true, data: null });
    }
    const result = await geoService.reverseGeocode(req.query.lat, req.query.lng);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { suggest, geocode, reverse };
