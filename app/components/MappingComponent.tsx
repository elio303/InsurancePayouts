"use client";

import { useEffect, useState } from 'react';

interface Mappings {
  columnsToDrop: string[];
  renameMapping: { [key: string]: string };
  columnsToKeep: string[];
  productNameMapping: { [key: string]: string };
  newColumns: string[];
}

export default function MappingComponent() {
  const [mappings, setMappings] = useState<Mappings | null>(null);

  useEffect(() => {
    // Fetch mappings from the API route
    async function fetchMappings() {
      const response = await fetch('/api/getMappings');
      const data = await response.json();
      setMappings(data);
    }

    fetchMappings();
  }, []);

  if (!mappings) {
    return <p>Loading mappings...</p>;
  }

  return (
    <div>
      <h1>Mappings</h1>
      <pre>{JSON.stringify(mappings, null, 2)}</pre>
    </div>
  );
}