import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, TextInput } from '@tremor/react';

export default function ModelsCatalog() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/claims-xiaomi/models');
      const data = await res.json();
      setModels(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Title>Catálogo de Modelos</Title>
          <Text>Administra los modelos comerciales, códigos PCBA y Goods IDs.</Text>
        </div>
        <Button size="sm">Añadir Modelo</Button>
      </div>
      
      <Card>
        {loading ? (
          <Text>Cargando modelos...</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Marca</TableHeaderCell>
                <TableHeaderCell>Modelo Comercial</TableHeaderCell>
                <TableHeaderCell>Color</TableHeaderCell>
                <TableHeaderCell>Código PCBA</TableHeaderCell>
                <TableHeaderCell>Goods ID</TableHeaderCell>
                <TableHeaderCell>Categoría</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-4">No hay modelos registrados</TableCell>
                </TableRow>
              ) : models.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell>{mod.marca}</TableCell>
                  <TableCell className="font-medium text-slate-900">{mod.modelo_comercial}</TableCell>
                  <TableCell>{mod.color}</TableCell>
                  <TableCell>{mod.codigo_pcba}</TableCell>
                  <TableCell>{mod.goods_id}</TableCell>
                  <TableCell>{mod.categoria}</TableCell>
                  <TableCell>{mod.estado ? 'Activo' : 'Inactivo'}</TableCell>
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
