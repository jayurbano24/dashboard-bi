import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, TextInput } from '@tremor/react';

export default function FallasCatalog() {
  const [fallas, setFallas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [notification, setNotification] = useState<string | null>(null);

  const fetchFallas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/claims-xiaomi/fallas');
      const data = await res.json();
      setFallas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFallas();
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

      const res = await fetch('/api/claims-xiaomi/fallas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        showToast('Guardado con éxito');
        setEditingId(null);
        fetchFallas();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro de eliminar esta falla?')) return;
    try {
      const res = await fetch(`/api/claims-xiaomi/fallas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Eliminado');
        fetchFallas();
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
    setEditForm({ id: newId, codigo_xiaomi: '', descripcion: '', palabras_clave: '', categoria: 'SMARTPHONE / TELEFONO MOVIL' });
    setFallas([{ id: newId, isNew: true }, ...fallas]);
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
          <Title>Catálogo de Fallas (Nivel 3)</Title>
          <Text>Cruce automático de palabras clave contra la falla reportada por el técnico.</Text>
        </div>
        <Button size="sm" onClick={addNew}>Añadir Falla</Button>
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
                <TableHeaderCell>Palabras Clave (sep. por comas)</TableHeaderCell>
                <TableHeaderCell>Categoría</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fallas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-4">No hay fallas registradas</TableCell>
                </TableRow>
              ) : fallas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    {editingId === f.id ? (
                      <TextInput 
                        value={editForm.codigo_xiaomi || ''} 
                        onChange={(e) => setEditForm({...editForm, codigo_xiaomi: e.target.value})}
                        placeholder="Ej: MP00FUN1801"
                      />
                    ) : (
                      <span className="font-bold text-slate-700">{f.codigo_xiaomi}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingId === f.id ? (
                      <TextInput 
                        value={editForm.descripcion || ''} 
                        onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                        placeholder="Ej: No Charging"
                      />
                    ) : (
                      <span className="text-slate-600">{f.descripcion}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === f.id ? (
                      <TextInput 
                        value={editForm.palabras_clave || ''} 
                        onChange={(e) => setEditForm({...editForm, palabras_clave: e.target.value})}
                        placeholder="ej: carga, puerto, no carga"
                      />
                    ) : (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">{f.palabras_clave}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingId === f.id ? (
                      <TextInput 
                        value={editForm.categoria || ''} 
                        onChange={(e) => setEditForm({...editForm, categoria: e.target.value})}
                        placeholder="Ej: SMARTPHONE"
                      />
                    ) : (
                      <span className="text-slate-600">{f.categoria}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === f.id ? (
                      <div className="flex gap-2">
                        <Button size="xs" color="emerald" onClick={() => handleSave(f.id)}>Guardar</Button>
                        <Button size="xs" color="gray" variant="secondary" onClick={() => {
                          setEditingId(null);
                          if (f.isNew) setFallas(fallas.filter(x => x.id !== f.id));
                        }}>Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="xs" variant="secondary" onClick={() => startEdit(f)}>Editar</Button>
                        <Button size="xs" color="red" variant="secondary" onClick={() => handleDelete(f.id)}>Borrar</Button>
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
