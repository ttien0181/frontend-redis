import React, { useState, useEffect, useCallback } from 'react';
import { Organization, RedisInstance, User } from '../types';
import { getOrganizations, getRedisInstances, createOrganization, createRedisInstance, updateOrganization, deleteOrganization, deleteRedisInstance } from '../services/api';
import { BuildingOfficeIcon, DatabaseIcon, PlusIcon, LogoutIcon, ArrowLeftIcon, SpinnerIcon, EditIcon, DeleteIcon, LogoIcon, WarningIcon } from './ui/Icons';

interface DashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
}

// Reusable Modal Component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <div>{children}</div>
            </div>
        </div>
    );
};

// Reusable Confirmation Modal
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isLoading?: boolean;
}
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isLoading = false }) => {
    if (!isOpen) return null;
    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                        <WarningIcon />
                    </div>
                    <div className="mt-0 text-left">
                        <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-400">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button type="button" onClick={onConfirm} disabled={isLoading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:w-auto sm:text-sm disabled:bg-red-400">
                        {isLoading ? 'Deleting...' : confirmText}
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-gray-300 hover:bg-slate-600 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
};

// Reusable Alert Modal
interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}
const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                        <WarningIcon />
                    </div>
                    <div className="mt-0 text-left">
                        <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-400">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:w-auto sm:text-sm">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ user, token, onLogout }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [redisInstances, setRedisInstances] = useState<RedisInstance[]>([]);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [isEditOrgModalOpen, setEditOrgModalOpen] = useState(false);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  const [isCreateRedisModalOpen, setCreateRedisModalOpen] = useState(false);
  const [redisToDelete, setRedisToDelete] = useState<RedisInstance | null>(null);

  const [newOrgData, setNewOrgData] = useState({ name: '', description: '', slug: '' });
  const [newRedisData, setNewRedisData] = useState({
    name: '', slug: '', max_memory: 104857600, redis_version: '7.2', persistence_enabled: true, backup_enabled: false,
  });

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const fetchOrgs = useCallback(async () => {
    setLoading('orgs');
    setError(null);
    try {
      const data = await getOrganizations(token);
      setOrganizations(data.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch organizations'); } 
    finally { setLoading(''); }
  }, [token]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const fetchRedisInstances = useCallback(async (orgId: string) => {
    setLoading('redis');
    setError(null);
    try {
        const data = await getRedisInstances(token, orgId);
        setRedisInstances(data.items);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch Redis instances');
        setRedisInstances([]);
    } finally { setLoading(''); }
  }, [token]);
  
  useEffect(() => {
      if (selectedOrg) { fetchRedisInstances(selectedOrg.id); }
  }, [selectedOrg, fetchRedisInstances]);

  // --- ORG HANDLERS ---
  const handleCreateOrg = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading('create-org');
      try {
          await createOrganization(token, { ...newOrgData, slug: newOrgData.slug || generateSlug(newOrgData.name) });
          setCreateOrgModalOpen(false);
          setNewOrgData({ name: '', description: '', slug: '' });
          fetchOrgs();
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create organization'); } 
      finally { setLoading(''); }
  };
  
  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgToEdit) return;
    setLoading('edit-org');
    try {
        await updateOrganization(token, orgToEdit.id, { name: orgToEdit.name, description: orgToEdit.description, slug: orgToEdit.slug });
        setEditOrgModalOpen(false);
        setOrgToEdit(null);
        fetchOrgs();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update organization'); }
    finally { setLoading(''); }
  };

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;
    setLoading('delete-org');
    setError(null);
    try {
        await deleteOrganization(token, orgToDelete.id);
        setOrgToDelete(null);
        fetchOrgs();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete organization';
        if (errorMessage.includes('active Redis instances')) {
            setAlertModal({
                isOpen: true,
                title: 'Deletion Failed',
                message: 'This organization cannot be deleted because it has active Redis instances. Please remove all instances first.'
            });
        } else {
            setError(errorMessage);
        }
        setOrgToDelete(null); // Close confirmation modal on error
    } finally {
        setLoading('');
    }
  }


  // --- REDIS HANDLERS ---
  const handleCreateRedis = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOrg) return;
      setLoading('create-redis');
      try {
          await createRedisInstance(token, selectedOrg.id, { ...newRedisData, organization_id: selectedOrg.id });
          setCreateRedisModalOpen(false);
          setNewRedisData({ name: '', slug: '', max_memory: 104857600, redis_version: '7.2', persistence_enabled: true, backup_enabled: false });
          fetchRedisInstances(selectedOrg.id);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create Redis instance'); } 
      finally { setLoading(''); }
  };

  const handleDeleteRedis = async () => {
    if (!redisToDelete || !selectedOrg) return;
    setLoading('delete-redis');
    try {
        await deleteRedisInstance(token, selectedOrg.id, redisToDelete.id);
        setRedisToDelete(null);
        fetchRedisInstances(selectedOrg.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete Redis instance'); }
    finally { setLoading(''); }
  }
  
  const StatusBadge = ({ status }: { status: string }) => {
    const colorMap: { [key: string]: string } = {
        running: 'bg-green-500/20 text-green-400 border-green-500/30',
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        stopped: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorMap[status] || colorMap['stopped']}`}>{status}</span>
  };

  const renderHeader = () => (
      <header className="bg-slate-900/70 backdrop-blur-sm p-4 sticky top-0 z-40 border-b border-slate-700/50">
          <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedOrg(null); setRedisInstances([]) }}>
                <LogoIcon/>
                <h1 className="text-xl font-bold text-white hidden sm:block">Cloud Dashboard</h1>
              </div>
              <div className="flex items-center gap-4">
                  <span className="text-gray-300 hidden md:block">{user.first_name} {user.last_name}</span>
                  <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-slate-700">
                      <LogoutIcon />
                      Logout
                  </button>
              </div>
          </div>
      </header>
  );

  const renderOrganizations = () => (
      <div>
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Organizations</h2>
              <button onClick={() => setCreateOrgModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/30">
                  <PlusIcon /> Create
              </button>
          </div>
          {loading === 'orgs' ? <div className="flex justify-center p-8"><SpinnerIcon /></div> :
           error && loading !== 'delete-org' ? <p className="text-red-400 bg-red-500/10 p-3 rounded-md">{error}</p> :
           organizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                    <div key={org.id} className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl shadow-lg transition-all duration-300 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-indigo-900/50 relative group">
                        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setOrgToEdit(org); setEditOrgModalOpen(true); }} className="p-2 rounded-full bg-slate-700 hover:bg-indigo-600 text-gray-300 hover:text-white"><EditIcon /></button>
                            <button onClick={(e) => { e.stopPropagation(); setOrgToDelete(org); }} className="p-2 rounded-full bg-slate-700 hover:bg-red-600 text-gray-300 hover:text-white"><DeleteIcon /></button>
                        </div>
                        <div onClick={() => setSelectedOrg(org)} className="cursor-pointer">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-2 bg-slate-700 rounded-lg"><BuildingOfficeIcon /></div>
                                <h3 className="text-xl font-semibold text-white">{org.name}</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-4 h-10 overflow-hidden">{org.description}</p>
                            <div className="text-xs text-gray-500 border-t border-slate-700 pt-3">Plan: <span className="font-semibold text-indigo-400">{org.plan}</span></div>
                        </div>
                    </div>
                ))}
            </div>
          ) : <div className="text-center py-10 bg-slate-800/50 rounded-lg border border-slate-700"><p className="text-gray-400">No organizations found. Let's create one!</p></div>}
      </div>
  );

  const renderRedisInstances = () => (
      <div>
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <button onClick={() => { setSelectedOrg(null); setRedisInstances([]) }} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-700 text-gray-400 hover:text-white">
                      <ArrowLeftIcon />
                  </button>
                  <h2 className="text-xl md:text-3xl font-bold text-white truncate">{selectedOrg?.name} / Instances</h2>
              </div>
              <button onClick={() => setCreateRedisModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/30">
                  <PlusIcon /> Create
              </button>
          </div>
          {loading === 'redis' ? <div className="flex justify-center p-8"><SpinnerIcon /></div> :
           error && loading !== 'delete-redis' ? <p className="text-red-400 bg-red-500/10 p-3 rounded-md">{error}</p> :
           redisInstances.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Domain</th>
                                <th className="p-4 font-semibold">Version</th>
                                <th className="p-4 font-semibold">Memory</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {redisInstances.map(inst => (
                                <tr key={inst.id} className="border-t border-slate-700 hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 flex items-center gap-3"><DatabaseIcon /> {inst.name}</td>
                                    <td className="p-4"><StatusBadge status={inst.status} /></td>
                                    <td className="p-4 font-mono text-sm text-gray-400 truncate max-w-xs">{inst.domain}</td>
                                    <td className="p-4">v{inst.redis_version}</td>
                                    <td className="p-4">{(inst.max_memory / (1024 * 1024)).toFixed(0)} MB</td>
                                    <td className="p-4"><button onClick={() => setRedisToDelete(inst)} className="p-2 rounded-full bg-slate-700 hover:bg-red-600 text-gray-300 hover:text-white"><DeleteIcon /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
           ) : <div className="text-center py-10 bg-slate-800/50 rounded-lg border border-slate-700"><p className="text-gray-400">No Redis instances found. Create one to get started.</p></div>}
      </div>
  );
  
  const formFieldClasses = "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";
  
  return (
    <>
      {renderHeader()}
      <main className="container mx-auto p-4 md:p-8">
        {selectedOrg ? renderRedisInstances() : renderOrganizations()}
      </main>

      {/* --- Modals --- */}
      <Modal isOpen={isCreateOrgModalOpen} onClose={() => setCreateOrgModalOpen(false)} title="Create New Organization">
          <form onSubmit={handleCreateOrg} className="space-y-4">
              <input type="text" placeholder="Organization Name" value={newOrgData.name} onChange={e => setNewOrgData({...newOrgData, name: e.target.value})} className={formFieldClasses} required />
              <textarea placeholder="Description" value={newOrgData.description} onChange={e => setNewOrgData({...newOrgData, description: e.target.value})} className={formFieldClasses} rows={3}></textarea>
              <button type="submit" disabled={loading === 'create-org'} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400 transition-colors">
                  {loading === 'create-org' ? 'Creating...' : 'Create Organization'}
              </button>
              {error && loading === 'create-org' && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          </form>
      </Modal>

      <Modal isOpen={isEditOrgModalOpen} onClose={() => setEditOrgModalOpen(false)} title="Edit Organization">
          <form onSubmit={handleEditOrg} className="space-y-4">
              <input type="text" placeholder="Organization Name" value={orgToEdit?.name || ''} onChange={e => setOrgToEdit(org => org ? {...org, name: e.target.value} : null)} className={formFieldClasses} required />
              <input type="text" placeholder="Slug" value={orgToEdit?.slug || ''} onChange={e => setOrgToEdit(org => org ? {...org, slug: e.target.value} : null)} className={formFieldClasses} required />
              <textarea placeholder="Description" value={orgToEdit?.description || ''} onChange={e => setOrgToEdit(org => org ? {...org, description: e.target.value} : null)} className={formFieldClasses} rows={3}></textarea>
              <button type="submit" disabled={loading === 'edit-org'} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400 transition-colors">
                  {loading === 'edit-org' ? 'Saving...' : 'Save Changes'}
              </button>
              {error && loading === 'edit-org' && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          </form>
      </Modal>

      <ConfirmationModal isOpen={!!orgToDelete} onClose={() => setOrgToDelete(null)} onConfirm={handleDeleteOrg} title="Delete Organization" message={`Are you sure you want to delete "${orgToDelete?.name}"? This action cannot be undone.`} isLoading={loading === 'delete-org'} confirmText="Delete" />

      <Modal isOpen={isCreateRedisModalOpen} onClose={() => setCreateRedisModalOpen(false)} title="Create New Redis Instance">
          <form onSubmit={handleCreateRedis} className="space-y-4">
              <input type="text" placeholder="Instance Name" value={newRedisData.name} onChange={e => setNewRedisData({...newRedisData, name: e.target.value, slug: generateSlug(e.target.value) })} className={formFieldClasses} required />
              <input type="text" placeholder="Slug" value={newRedisData.slug} onChange={e => setNewRedisData({...newRedisData, slug: e.target.value})} className={formFieldClasses} required />
              <select value={newRedisData.redis_version} onChange={e => setNewRedisData({...newRedisData, redis_version: e.target.value})} className={formFieldClasses}>
                  <option value="7.2">Redis 7.2</option>
                  <option value="7.0">Redis 7.0</option>
                  <option value="6.2">Redis 6.2</option>
              </select>
              <input type="number" placeholder="Max Memory (MB)" value={newRedisData.max_memory / (1024*1024)} onChange={e => setNewRedisData({...newRedisData, max_memory: parseInt(e.target.value) * 1024 * 1024})} className={formFieldClasses} required />
              <div className="flex items-center justify-between pt-2">
                  <label htmlFor="persistence_enabled" className="text-gray-300">Enable Persistence</label>
                  <input type="checkbox" id="persistence_enabled" checked={newRedisData.persistence_enabled} onChange={e => setNewRedisData({...newRedisData, persistence_enabled: e.target.checked})} className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-slate-800" />
              </div>
              <div className="flex items-center justify-between">
                  <label htmlFor="backup_enabled" className="text-gray-300">Enable Backups</label>
                  <input type="checkbox" id="backup_enabled" checked={newRedisData.backup_enabled} onChange={e => setNewRedisData({...newRedisData, backup_enabled: e.target.checked})} className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-slate-800" />
              </div>
              <button type="submit" disabled={loading === 'create-redis'} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400 !mt-6">
                  {loading === 'create-redis' ? 'Creating...' : 'Create Instance'}
              </button>
              {error && loading === 'create-redis' && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          </form>
      </Modal>

      <ConfirmationModal isOpen={!!redisToDelete} onClose={() => setRedisToDelete(null)} onConfirm={handleDeleteRedis} title="Delete Redis Instance" message={`Are you sure you want to delete "${redisToDelete?.name}"? This action is permanent.`} isLoading={loading === 'delete-redis'} confirmText="Delete" />
      
      <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ isOpen: false, title: '', message: '' })}
          title={alertModal.title}
          message={alertModal.message}
      />
    </>
  );
};

export default Dashboard;