import React, { useEffect, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

type MarkerProps = google.maps.MarkerOptions & {
  onClick?: () => void;
  map?: google.maps.Map;
  markerClusterer?: MarkerClusterer;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  color?: string;
};

const MARKER_ICON = {
  path:
    "M12 23.728L5.636 17.364C4.37734 16.1054 3.52019 14.5017 3.17293 12.7559C2.82567 11.0101 3.00391 9.20047 3.6851 7.55595C4.36629 5.91142 5.51984 4.50582 6.99988 3.51689C8.47992 2.52796 10.22 2.00012 12 2.00012C13.78 2.00012 15.5201 2.52796 17.0001 3.51689C18.4802 4.50582 19.6337 5.91142 20.3149 7.55595C20.9961 9.20047 21.1743 11.0101 20.8271 12.7559C20.4798 14.5017 19.6227 16.1054 18.364 17.364L12 23.728ZM10.5858 12.4143C10.9609 12.7893 11.4696 13 12 13C12.5304 13 13.0391 12.7893 13.4142 12.4143C13.7893 12.0392 14 11.5305 14 11C14 10.4696 13.7893 9.9609 13.4142 9.58583C13.0391 9.21076 12.5304 9.00004 12 9.00004C11.4696 9.00004 10.9609 9.21076 10.5858 9.58583C10.2107 9.9609 10 10.4696 10 11C10 11.5305 10.2107 12.0392 10.5858 12.4143Z",
  fillOpacity: 1,
  strokeWeight: 0,
  scale: 1,
};

const Marker: React.FC<MarkerProps> = (options) => {
  const {
    color,
    markerClusterer,
    onClick,
    onDragEnd,
    position,
    ...rest
  } = options;
  const [marker, setMarker] = useState<google.maps.Marker>();

  const icon = {
    ...MARKER_ICON,
    anchor: new google.maps.Point(12, 24),
    fillColor: color || "#ea4335",
  };

  useEffect(() => {
    if (!marker) {
      const googleMapMarker = new google.maps.Marker({
        position,
        icon,
      });

      googleMapMarker.addListener("click", () => {
        if (onClick) onClick();
      });

      googleMapMarker.setOptions(rest);

      setMarker(googleMapMarker);
    }

    if (markerClusterer && marker) {
      markerClusterer.addMarker(marker);
    }

    // remove marker from map on unmount
    return () => {
      if (marker) {
        marker.setMap(null);
      }

      if (markerClusterer && marker) {
        markerClusterer.removeMarker(marker);
      }
    };
  }, [marker, markerClusterer]);

  // track color change
  useEffect(() => {
    if (!marker) return;

    marker.setIcon(icon);
  }, [color]);

  // track position
  useEffect(() => {
    if (!marker) return;

    marker.setPosition(position);
  }, [position]);

  // track on onclick
  useEffect(() => {
    if (!marker) return;

    marker.addListener("click", () => {
      if (onClick) onClick();
    });
  }, [marker, onClick]);

  // add dragend event on marker
  useEffect(() => {
    if (!marker) return;

    marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
      if (onDragEnd) onDragEnd(e);
    });
  }, [marker, options.onDragEnd]);

  return null;
};

export default Marker;
