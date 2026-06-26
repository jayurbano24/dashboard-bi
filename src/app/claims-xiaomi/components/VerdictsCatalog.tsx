import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, TextInput, Select, SelectItem } from '@tremor/react';

export default function VerdictsCatalog() {
  const [verdicts, setVerdicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [notification, setNotification] = useState<string | null>(null);

  const fetchVerdicts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/claims-xiaomi/verdicts');
      const data = await res.json();
      setVerdicts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVerdicts();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async (id: string | null) => {
    try {
      const isNew = !id || id.startsWith('new-');
      const method = isNew ? 'POST' : 'PUT';
      const body = { ...editForm };
      if (!isNew) body.id = id;
      else delete body.id;

      const res = await fetch('/api/claims-xiaomi/verdicts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        showToast('Guardado con éxito');
        setEditingId(null);
        fetchVerdicts();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro de eliminar este veredicto?')) return;
    try {
      const res = await fetch(`/api/claims-xiaomi/verdicts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Eliminado');
        fetchVerdicts();
      }
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const startEdit = (v: any) => {
    setEditingId(v.id);
    setEditForm({ ...v });
  };

  const addNew = () => {
    const newId = `new-${Date.now()}`;
    setEditingId(newId);
    setEditForm({ id: newId, veredicto: '', service_type: 'Repair', processing_method: '5001' });
    setVerdicts([{ id: newId, isNew: true }, ...verdicts]);
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl">
          ✓ {notification}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <Title>Catálogo de Veredictos (Reglas Automáticas)</Title>
          <Text>Asigna un Service Type y Processing Method automático dependiendo del "Estado" de Orderry.</Text>
        </div>
        <Button size="sm" onClick={addNew}>Añadir Regla</Button>
      </div>
      
      <Card>
        {loading ? (
          <Text>Cargando veredictos...</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Veredicto / Estado (Orderry)</TableHeaderCell>
                <TableHeaderCell>Service Type (ISP)</TableHeaderCell>
                <TableHeaderCell>Processing Method Code</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verdicts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-4">No hay veredictos registrados</TableCell>
                </TableRow>
              ) : verdicts.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {editingId === v.id ? (
                      <TextInput 
                        value={editForm.veredicto || ''} 
                        onChange={(e) => setEditForm({...editForm, veredicto: e.target.value.toUpperCase()})}
                        placeholder="Ej: NOTA DE CREDITO"
                      />
                    ) : (
                      <span className="font-bold text-slate-700">{v.veredicto}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingId === v.id ? (
                      <Select 
                        value={editForm.service_type || ''} 
                        onValueChange={(val) => setEditForm({...editForm, service_type: val})}
                      >
                        <SelectItem value="Repair">Repair</SelectItem>
                        <SelectItem value="Inspection">Inspection</SelectItem>
                      </Select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${v.service_type === 'Repair' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {v.service_type}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingId === v.id ? (
                      <TextInput 
                        value={editForm.processing_method || ''} 
                        onChange={(e) => setEditForm({...editForm, processing_method: e.target.value})}
                        placeholder="Ej: 5001"
                      />
                    ) : (
                      <span className="font-mono">{v.processing_method}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === v.id ? (
                      <div className="flex gap-2">
                        <Button size="xs" color="emerald" onClick={() => handleSave(v.id)}>Guardar</Button>
                        <Button size="xs" color="gray" variant="secondary" onClick={() => {
                          setEditingId(null);
                          if (v.isNew) setVerdicts(verdicts.filter(x => x.id !== v.id));
                        }}>Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="xs" variant="secondary" onClick={() => startEdit(v)}>Editar</Button>
                        <Button size="xs" color="red" variant="secondary" onClick={() => handleDelete(v.id)}>Borrar</Button>
                      </div>
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
