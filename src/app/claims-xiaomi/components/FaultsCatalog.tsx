import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';

export default function FaultsCatalog() {
  const [faults, setFaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFaults = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/claims-xiaomi/faults');
      const data = await res.json();
      setFaults(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFaults();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Title>Catálogo de Fallas (Symptom Codes)</Title>
          <Text>Gestiona los códigos oficiales MP00/PA00 y sus palabras clave.</Text>
        </div>
        <Button size="sm">Añadir Falla</Button>
      </div>
      
      <Card>
        {loading ? (
          <Text>Cargando fallas...</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Código Xiaomi</TableHeaderCell>
                <TableHeaderCell>Descripción Oficial</TableHeaderCell>
                <TableHeaderCell>Palabras Clave (Traductor)</TableHeaderCell>
                <TableHeaderCell>Categoría</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-4">No hay fallas registradas</TableCell>
                </TableRow>
              ) : faults.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-slate-900">{f.codigo_xiaomi}</TableCell>
                  <TableCell>{f.descripcion}</TableCell>
                  <TableCell className="text-xs text-slate-500">{f.palabras_clave}</TableCell>
                  <TableCell>{f.categoria}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="xs" variant="secondary">Editar</Button>
                      <Button size="xs" color="red" variant="secondary">Borrar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
