import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, TextInput } from '@tremor/react';

export default function ConfigCatalog() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/claims-xiaomi/config');
      const data = await res.json();
      setConfigs(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (key: string) => {
    try {
      await fetch('/api/claims-xiaomi/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editValue }),
      });
      setEditingKey(null);
      fetchConfigs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <Title>Configuración Global (Parámetros Xiaomi)</Title>
      <Text>Gestiona las variables estáticas requeridas para los reportes (ISP_SC_CODE, CUSTOMER_EMAIL, etc.).</Text>
      
      <Card>
        {loading ? (
          <Text>Cargando configuraciones...</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Variable (Key)</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Descripción</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((conf) => (
                <TableRow key={conf.key}>
                  <TableCell className="font-medium text-slate-900">{conf.key}</TableCell>
                  <TableCell>
                    {editingKey === conf.key ? (
                      <TextInput 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                      />
                    ) : (
                      conf.value
                    )}
                  </TableCell>
                  <TableCell>{conf.description}</TableCell>
                  <TableCell>
                    {editingKey === conf.key ? (
                      <div className="flex gap-2">
                        <Button size="xs" color="emerald" onClick={() => handleSave(conf.key)}>Guardar</Button>
                        <Button size="xs" color="gray" variant="secondary" onClick={() => setEditingKey(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <Button size="xs" variant="secondary" onClick={() => {
                        setEditingKey(conf.key);
                        setEditValue(conf.value);
                      }}>Editar</Button>
                    )}
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
