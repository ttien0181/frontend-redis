import React, { useState, useEffect, useCallback } from 'react';
import { Organization, RedisInstance, User } from '../types';
import { getOrganizations, getRedisInstances, createOrganization, createRedisInstance } from '../services/api';
import { BuildingOfficeIcon, DatabaseIcon, PlusIcon, LogoutIcon, ArrowLeftIcon, SpinnerIcon } from './ui/Icons';

interface DashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
}

// Fix: Refactored Modal component to use a props interface and React.FC for better type inference.
// This resolves the error where the `children` prop was not being correctly identified.
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

// Modal Component
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
                <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
                <div>{children}</div>
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

  const [isCreateOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [newOrgData, setNewOrgData] = useState({ name: '', description: '', slug: '' });

  const [isCreateRedisModalOpen, setCreateRedisModalOpen] = useState(false);
  const [newRedisData, setNewRedisData] = useState({
    name: '',
    slug: '',
    max_memory: 104857600,
    redis_version: '7.2',
    persistence_enabled: true,
    backup_enabled: false,
  });

  const fetchOrgs = useCallback(async () => {
    setLoading('orgs');
    setError(null);
    try {
      const data = await getOrganizations(token);
      setOrganizations(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading('');
    }
  }, [token]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const fetchRedisInstances = useCallback(async (orgId: string) => {
    setLoading('redis');
    setError(null);
    try {
        const data = await getRedisInstances(token, orgId);
        setRedisInstances(data.items);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch Redis instances');
        setRedisInstances([]);
    } finally {
        setLoading('');
    }
  }, [token]);
  
  useEffect(() => {
      if (selectedOrg) {
          fetchRedisInstances(selectedOrg.id);
      }
  }, [selectedOrg, fetchRedisInstances]);

  const handleCreateOrg = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading('create-org');
      try {
          await createOrganization(token, { ...newOrgData, slug: newOrgData.name.toLowerCase().replace(/\s+/g, '-') });
          setCreateOrgModalOpen(false);
          setNewOrgData({ name: '', description: '', slug: '' });
          fetchOrgs();
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create organization');
      } finally {
        setLoading('');
      }
  };

  const handleCreateRedis = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOrg) return;
      setLoading('create-redis');
      try {
          const payload = {
            ...newRedisData,
            organization_id: selectedOrg.id,
          };
          await createRedisInstance(token, selectedOrg.id, payload);
          setCreateRedisModalOpen(false);
          setNewRedisData({
              name: '',
              slug: '',
              max_memory: 104857600,
              redis_version: '7.2',
              persistence_enabled: true,
              backup_enabled: false,
          });
          fetchRedisInstances(selectedOrg.id);
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create Redis instance');
      } finally {
        setLoading('');
      }
  };
  
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
      <header className="bg-slate-900/70 backdrop-blur-sm p-4 sticky top-0 z-10 border-b border-slate-700/50">
          <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Cloud Dashboard</h1>
              <div className="flex items-center gap-4">
                  <span className="text-gray-300">{user.first_name} {user.last_name}</span>
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
              <button onClick={() => setCreateOrgModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  <PlusIcon /> Create
              </button>
          </div>
          {loading === 'orgs' ? <div className="flex justify-center p-8"><SpinnerIcon /></div> :
           error ? <p className="text-red-400">{error}</p> :
           organizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                    <div key={org.id} onClick={() => setSelectedOrg(org)} className="bg-slate-800 p-6 rounded-xl shadow-lg cursor-pointer hover:bg-slate-700 hover:scale-105 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-3">
                            <BuildingOfficeIcon />
                            <h3 className="text-xl font-semibold text-white">{org.name}</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">{org.description}</p>
                        <div className="text-xs text-gray-500">Plan: <span className="font-semibold text-indigo-400">{org.plan}</span></div>
                    </div>
                ))}
            </div>
          ) : <p>No organizations found.</p>}
      </div>
  );

  const renderRedisInstances = () => (
      <div>
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <button onClick={() => { setSelectedOrg(null); setRedisInstances([]) }} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-700 text-gray-400 hover:text-white">
                      <ArrowLeftIcon />
                  </button>
                  <h2 className="text-3xl font-bold text-white">{selectedOrg?.name} / Instances</h2>
              </div>
              <button onClick={() => setCreateRedisModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  <PlusIcon /> Create Instance
              </button>
          </div>
          {loading === 'redis' ? <div className="flex justify-center p-8"><SpinnerIcon /></div> :
           error ? <p className="text-red-400">{error}</p> :
           redisInstances.length > 0 ? (
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-700/50">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Domain</th>
                            <th className="p-4 font-semibold">Version</th>
                            <th className="p-4 font-semibold">Memory</th>
                        </tr>
                    </thead>
                    <tbody>
                        {redisInstances.map(inst => (
                            <tr key={inst.id} className="border-t border-slate-700 hover:bg-slate-700/50 transition-colors">
                                <td className="p-4 flex items-center gap-3"><DatabaseIcon /> {inst.name}</td>
                                <td className="p-4"><StatusBadge status={inst.status} /></td>
                                <td className="p-4 font-mono text-sm text-gray-400">{inst.domain}</td>
                                <td className="p-4">v{inst.redis_version}</td>
                                <td className="p-4">{(inst.max_memory / (1024 * 1024)).toFixed(0)} MB</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
           ) : <p>No Redis instances found for this organization.</p>}
      </div>
  );
  
  const formFieldClasses = "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none";
  
  return (
    <>
      {renderHeader()}
      <main className="container mx-auto p-8">
        {selectedOrg ? renderRedisInstances() : renderOrganizations()}
      </main>

      <Modal isOpen={isCreateOrgModalOpen} onClose={() => setCreateOrgModalOpen(false)} title="Create New Organization">
          <form onSubmit={handleCreateOrg} className="space-y-4">
              <input type="text" placeholder="Organization Name" value={newOrgData.name} onChange={e => setNewOrgData({...newOrgData, name: e.target.value})} className={formFieldClasses} required />
              <textarea placeholder="Description" value={newOrgData.description} onChange={e => setNewOrgData({...newOrgData, description: e.target.value})} className={formFieldClasses} rows={3}></textarea>
              <button type="submit" disabled={loading === 'create-org'} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400">
                  {loading === 'create-org' ? 'Creating...' : 'Create Organization'}
              </button>
              {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          </form>
      </Modal>

      <Modal isOpen={isCreateRedisModalOpen} onClose={() => setCreateRedisModalOpen(false)} title="Create New Redis Instance">
          <form onSubmit={handleCreateRedis} className="space-y-4">
              <input type="text" placeholder="Instance Name" value={newRedisData.name} onChange={e => {
                const name = e.target.value;
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setNewRedisData({...newRedisData, name, slug });
              }} className={formFieldClasses} required />
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
              {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          </form>
      </Modal>
    </>
  );
};

export default Dashboard;