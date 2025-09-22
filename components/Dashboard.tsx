import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Organization, RedisInstance, User } from '../types';
import { getOrganizations, getRedisInstances, createOrganization, createRedisInstance, updateOrganization, deleteOrganization, deleteRedisInstance } from '../services/api';
import { BuildingOfficeIcon, DatabaseIcon, PlusIcon, LogoutIcon, ArrowLeftIcon, SpinnerIcon, EditIcon, DeleteIcon, LogoIcon, WarningIcon, CopyIcon, CheckIcon, HamburgerIcon, CloseIcon, UserIcon } from './ui/Icons';
import LandingPage from './LandingPage';
import DocsPage from './DocsPage';
import UserGuidesPage from './UserGuidesPage';
import TermsOfServicePage from './TermsOfServicePage';

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
    return (
        <div 
          className={`fixed inset-0 bg-black z-50 flex justify-center items-center p-4 transition-all duration-300 ease-in-out ${isOpen ? 'bg-opacity-60 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'}`} 
          onClick={onClose}
        >
            <div 
              className={`bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100' : 'scale-95'}`}
              onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-semibold text-slate-900 mb-4">{title}</h3>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 text-2xl leading-none">&times;</button>
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
    return (
         <div 
           className={`fixed inset-0 z-50 flex justify-center items-center p-4 transition-all duration-300 ease-in-out ${isOpen ? 'bg-black bg-opacity-60 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'}`}
           onClick={onClose}
         >
            <div 
              className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100' : 'scale-95'}`}
              onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <WarningIcon />
                    </div>
                    <div className="mt-0 text-left">
                        <h3 className="text-lg leading-6 font-medium text-slate-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-slate-500">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button type="button" onClick={onConfirm} disabled={isLoading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:w-auto sm:text-sm disabled:bg-red-400">
                        {isLoading ? 'Deleting...' : confirmText}
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">
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
    return (
        <div 
          className={`fixed inset-0 z-50 flex justify-center items-center p-4 transition-all duration-300 ease-in-out ${isOpen ? 'bg-black bg-opacity-60 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'}`}
          onClick={onClose}
        >
            <div 
              className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100' : 'scale-95'}`}
              onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <WarningIcon />
                    </div>
                    <div className="mt-0 text-left">
                        <h3 className="text-lg leading-6 font-medium text-slate-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-slate-500">{message}</p>
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

const InstanceDetailsView: React.FC<{ selectedOrg: Organization; selectedInstance: RedisInstance; onBack: () => void; }> = ({ selectedOrg, selectedInstance, onBack }) => {
    const [copiedText, setCopiedText] = useState('');
    const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
    const [paramValues, setParamValues] = useState<{ [key: string]: string }>({});

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedText(text);
            setTimeout(() => setCopiedText(''), 2000);
        });
    };
    
    const BASE_API_URL = 'http://localhost:8080';

    const getParamsFromPath = (path: string): string[] => {
        const colonParams = (path.match(/:(\w+)/g) || [])
            .map(match => match.substring(1))
            .filter(param => !['instance_id', 'org_id', 'key_id'].includes(param));
    
        const starParams = path.includes('/*path') ? ['...path'] : [];
    
        return [...colonParams, ...starParams];
    };
    
    const ChevronDownIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );

    const allEndpoints = [
        {
            category: 'Redis HTTP API',
            description: 'Requires API key authentication. The endpoints below are pre-filled with your instance ID for convenience.',
            endpoints: [
                { method: 'GET', path: '/redis/:instance_id/ping', description: 'Pings the Redis instance.' },
                { method: 'GET', path: '/redis/:instance_id/set/:key/:value', description: 'Sets a key with a value.' },
                { method: 'GET', path: '/redis/:instance_id/get/:key', description: 'Gets the value of a key.' },
                { method: 'GET', path: '/redis/:instance_id/del/:key', description: 'Deletes a key.' },
                { method: 'GET', path: '/redis/:instance_id/incr/:key', description: 'Increments the value of a key.' },
                { method: 'GET', path: '/redis/:instance_id/hset/:key/:field/:value', description: 'Sets a field in a hash.' },
                { method: 'GET', path: '/redis/:instance_id/hget/:key/:field', description: 'Gets a field from a hash.' },
                { method: 'GET', path: '/redis/:instance_id/lpush/:key/:value', description: 'Prepends a value to a list.' },
                { method: 'GET', path: '/redis/:instance_id/lpop/:key', description: 'Removes and gets the first element in a list.' },
            ]
        },
        {
            category: 'Generic Redis Commands',
            description: 'Requires API key authentication.',
            endpoints: [
                { method: 'POST', path: '/redis/:instance_id', description: 'Executes a generic Redis command via JSON body.' },
                { method: 'GET', path: '/redis/:instance_id/*path', description: 'Catch-all route for debugging Redis requests.' },
            ]
        },
    ];

    return (
        <div>
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900">
                        <ArrowLeftIcon />
                    </button>
                    <div>
                        <h2 className="text-xl md:text-3xl font-bold text-slate-900 truncate">{selectedInstance.name} - API Guide</h2>
                        <p className="text-slate-500 font-mono text-sm">{selectedInstance.domain}</p>
                    </div>
                </div>
            </div>
            {allEndpoints.map(category => (
                <div key={category.category} className="mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{category.category}</h3>
                    <p className="text-slate-500 mb-4 border-b border-slate-200 pb-3">{category.description}</p>
                     <div className="space-y-2">
                        {category.endpoints.map(ep => {
                            const params = getParamsFromPath(ep.path);
                            const isExpandable = params.length > 0;
                            const isExpanded = expandedEndpoint === ep.path;
                            
                            const displayPath = ep.path
                                .replace(':instance_id', selectedInstance.id)
                                .replace(/:(\w+)/g, `{\$1}`)
                                .replace('/*path', '/{...path}');

                            const finalUrl = `${BASE_API_URL}${displayPath}`;
                            
                            const urlToCopy = Object.entries(paramValues).reduce(
                                (url, [key, value]) => url.replace(`{${key}}`, encodeURIComponent(value || `{${key}}`)),
                                finalUrl
                            );

                            const handleToggleExpand = () => {
                                if (isExpandable) {
                                    if (isExpanded) {
                                        setExpandedEndpoint(null);
                                    } else {
                                        setExpandedEndpoint(ep.path);
                                        const initialParams = params.reduce((acc, param) => ({...acc, [param]: ''}), {});
                                        setParamValues(initialParams);
                                    }
                                }
                            };

                            const methodColors: { [key: string]: { bg: string, border: string, text: string, hoverBg: string } } = {
                                'GET':    { bg: 'bg-sky-50',    border: 'border-sky-300',    text: 'text-sky-800',    hoverBg: 'hover:bg-sky-100' },
                                'POST':   { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  hoverBg: 'hover:bg-green-100' },
                                'PUT':    { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', hoverBg: 'hover:bg-yellow-100' },
                                'DELETE': { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    hoverBg: 'hover:bg-red-100' },
                                'ANY':    { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', hoverBg: 'hover:bg-purple-100' }
                            };
                            const color = methodColors[ep.method] || { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800', hoverBg: 'hover:bg-slate-100' };

                            return (
                                <div key={ep.path} className={`border ${isExpanded ? color.border : 'border-slate-200'} rounded-lg overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg' : 'shadow-sm'}`}>
                                    <div
                                        onClick={handleToggleExpand}
                                        className={`flex items-center justify-between p-3 ${isExpandable ? 'cursor-pointer' : ''} ${color.bg} ${isExpandable ? color.hoverBg : ''} transition-colors`}
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <span className={`font-mono text-sm font-bold w-[70px] text-center flex-shrink-0 ${color.text}`}>{ep.method}</span>
                                            <span className="font-mono text-sm text-slate-700 break-words min-w-0">{displayPath}</span>
                                        </div>
                                        <div className="flex items-center gap-4 ml-4">
                                            <p className="text-sm text-slate-600 hidden md:block flex-shrink-0">{ep.description}</p>
                                            {!isExpandable && (
                                                <button onClick={(e) => { e.stopPropagation(); handleCopy(finalUrl); }} className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md transition-colors">
                                                    {copiedText === finalUrl ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                                                </button>
                                            )}
                                            {isExpandable && (
                                                <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                  <ChevronDownIcon />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-4 bg-white animate-fadeInUp" style={{animationDuration: '0.3s'}}>
                                            <h4 className="font-semibold text-slate-800 text-md mb-3">Parameters</h4>
                                            <div className="space-y-3">
                                                {params.map(param => (
                                                    <div key={param} className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <label htmlFor={param} className="font-mono text-sm text-slate-600 text-right font-medium">
                                                            {param}
                                                            <span className="text-red-500 ml-1">*</span>
                                                        </label>
                                                        <input
                                                            id={param}
                                                            type="text"
                                                            placeholder={`string`}
                                                            value={paramValues[param] || ''}
                                                            onChange={(e) => setParamValues(prev => ({ ...prev, [param]: e.target.value }))}
                                                            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="border-t mt-4 pt-4 flex justify-end">
                                                <button onClick={() => handleCopy(urlToCopy)} className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-md transition-colors shadow-sm">
                                                    {copiedText === urlToCopy ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy URL</>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

const Dashboard: React.FC<DashboardProps> = ({ user, token, onLogout }) => {
  type View = 'dashboard' | 'docs' | 'guides' | 'terms';
  type DashboardView = 'landing' | 'organizations' | 'instances' | 'details';
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [redisInstances, setRedisInstances] = useState<RedisInstance[]>([]);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState<string | null>(null);

  // View management state
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [dashboardView, setDashboardView] = useState<DashboardView>('landing');
  const [animation, setAnimation] = useState({ class: 'animate-fadeInUp', key: Date.now() });

  const [selectedInstance, setSelectedInstance] = useState<RedisInstance | null>(null);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      if (data.items.length > 0 && dashboardView === 'landing') {
          setDashboardView('organizations');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch organizations'); } 
    finally { setLoading(''); }
  }, [token, dashboardView]);

  useEffect(() => { 
      if(currentView === 'dashboard') {
          fetchOrgs(); 
      }
  }, [fetchOrgs, currentView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setUserMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);

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
  
  // Initial fetch when an org is selected
  useEffect(() => {
      if (selectedOrg) { fetchRedisInstances(selectedOrg.id); }
  }, [selectedOrg, fetchRedisInstances]);

  // Polling for Redis instance status updates
  useEffect(() => {
    if (!selectedOrg || dashboardView !== 'instances' || currentView !== 'dashboard') {
      return; // Stop polling
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await getRedisInstances(token, selectedOrg.id);
        setRedisInstances(data.items);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or when dependencies change
  }, [selectedOrg, dashboardView, token, currentView]);

  // --- Navigation Handlers ---
  const handleNavigate = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleGoToOrganizationsList = () => {
    if (currentView === 'dashboard' && (dashboardView === 'instances' || dashboardView === 'details')) {
         setAnimation({ class: 'slide-back-enter', key: Date.now() });
    } else if (currentView !== 'dashboard') {
         setAnimation({ class: 'animate-fadeInUp', key: Date.now() });
    }
    // No animation change if already on orgs list.

    setCurrentView('dashboard');
    setDashboardView('organizations');
    setSelectedOrg(null);
    setSelectedInstance(null);
    setMobileMenuOpen(false);
  };

  const handleGetStarted = () => {
    setAnimation({ class: 'slide-enter', key: Date.now() });
    setDashboardView('organizations');
  };

  const handleSelectOrg = (org: Organization) => {
      setSelectedOrg(org);
      setAnimation({ class: 'slide-enter', key: Date.now() });
      setDashboardView('instances');
  };

  const handleSelectInstance = (inst: RedisInstance) => {
      setSelectedInstance(inst);
      setAnimation({ class: 'slide-enter', key: Date.now() });
      setDashboardView('details');
  };

  const handleBack = () => {
      setAnimation({ class: 'slide-back-enter', key: Date.now() });
      if (dashboardView === 'details') {
          setSelectedInstance(null);
          setDashboardView('instances');
      } else if (dashboardView === 'instances') {
          setSelectedOrg(null);
          setDashboardView('organizations');
      }
  };

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
        if (selectedOrg?.id === orgToDelete.id) {
            handleBack(); // Go back if we deleted the selected org
        }
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
        running: 'bg-green-100 text-green-800 border-green-200/60',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200/60',
        stopped: 'bg-slate-100 text-slate-800 border-slate-200/60',
        error: 'bg-red-100 text-red-800 border-red-200/60',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorMap[status] || colorMap['stopped']}`}>{status}</span>
  };

  const NavLink: React.FC<{ view: View, current: View, children: React.ReactNode, setView: (view: View) => void }> = ({ view, current, children, setView }) => (
    <button 
        onClick={() => setView(view)} 
        className={`text-sm font-medium transition-colors p-2 rounded-md ${current === view ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
    >
        {children}
    </button>
  );

  const renderHeader = () => (
      <header className="bg-white/80 backdrop-blur-sm p-4 sticky top-0 z-40 border-b border-slate-200">
          <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-6">
                <button className="flex items-center gap-3" onClick={handleGoToOrganizationsList}>
                    <LogoIcon/>
                    <h1 className="text-xl font-bold text-slate-900 hidden sm:block">RedisGate</h1>
                </button>
                <nav className="hidden lg:flex items-center gap-2">
                    <NavLink view="docs" current={currentView} setView={handleNavigate}>Docs</NavLink>
                    <NavLink view="guides" current={currentView} setView={handleNavigate}>User Guides</NavLink>
                    <NavLink view="terms" current={currentView} setView={handleNavigate}>Terms of Service</NavLink>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                  <div className="lg:hidden">
                    <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                        {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
                    </button>
                  </div>
                  <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setUserMenuOpen(prev => !prev)} className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <span className="text-slate-700 font-medium hidden lg:block">{user.first_name} {user.last_name}</span>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                            <UserIcon />
                        </div>
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fadeInUp" style={{animationDuration: '0.15s'}}>
                            <div className="py-1">
                                <div className="px-4 py-2">
                                    <p className="text-sm font-medium text-slate-900 truncate">{user.first_name} {user.last_name}</p>
                                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                                </div>
                                <div className="border-t border-slate-200"></div>
                                <button
                                    onClick={() => { onLogout(); setUserMenuOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                    <LogoutIcon />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
              </div>
          </div>
          {isMobileMenuOpen && (
              <nav className="lg:hidden mt-4 container mx-auto flex flex-col items-start gap-2 animate-fadeInUp">
                  <NavLink view="docs" current={currentView} setView={handleNavigate}>Docs</NavLink>
                  <NavLink view="guides" current={currentView} setView={handleNavigate}>User Guides</NavLink>
                  <NavLink view="terms" current={currentView} setView={handleNavigate}>Terms of Service</NavLink>
              </nav>
          )}
      </header>
  );

  const renderOrganizations = () => (
      <div>
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-slate-900">Organizations</h2>
              <button onClick={() => setCreateOrgModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/30">
                  <PlusIcon /> Create
              </button>
          </div>
          {loading === 'orgs' ? <div className="flex justify-center p-8"><SpinnerIcon /></div> :
           error && loading !== 'delete-org' ? <p className="text-red-700 bg-red-100 p-3 rounded-md">{error}</p> :
           organizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                    <div key={org.id} className="bg-white border border-slate-200 p-6 rounded-xl shadow-md flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-indigo-400 relative group">
                        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setOrgToEdit(org); setEditOrgModalOpen(true); }} className="p-2 rounded-full bg-slate-100 hover:bg-indigo-500 text-slate-500 hover:text-white"><EditIcon /></button>
                            <button onClick={(e) => { e.stopPropagation(); setOrgToDelete(org); }} className="p-2 rounded-full bg-slate-100 hover:bg-red-500 text-slate-500 hover:text-white"><DeleteIcon /></button>
                        </div>
                        <div onClick={() => handleSelectOrg(org)} className="cursor-pointer">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-2 bg-slate-100 rounded-lg"><BuildingOfficeIcon /></div>
                                <h3 className="text-xl font-semibold text-slate-800">{org.name}</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 h-10 overflow-hidden">{org.description}</p>
                            <div className="text-xs text-slate-500 border-t border-slate-200 pt-3">Plan: <span className="font-semibold text-indigo-600">{org.plan}</span></div>
                        </div>
                    </div>
                ))}
            </div>
          ) : <div className="text-center py-10 bg-white rounded-lg border border-slate-200"><p className="text-slate-500">No organizations found. Let's create one!</p></div>}
      </div>
  );

  const renderRedisInstances = () => (
      <div>
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <button onClick={handleBack} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900">
                      <ArrowLeftIcon />
                  </button>
                  <h2 className="text-xl md:text-3xl font-bold text-slate-900 truncate">{selectedOrg?.name} / Instances</h2>
              </div>
              <button onClick={() => setCreateRedisModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/30">
                  <PlusIcon /> Create
              </button>
          </div>
          {loading === 'redis' ? <div className="flex justify-center p-8"><SpinnerIcon /></div> :
           error && loading !== 'delete-redis' ? <p className="text-red-700 bg-red-100 p-3 rounded-md">{error}</p> :
           redisInstances.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">Name</th>
                                <th className="p-4 font-semibold text-slate-600">Status</th>
                                <th className="p-4 font-semibold text-slate-600">Domain</th>
                                <th className="p-4 font-semibold text-slate-600">Version</th>
                                <th className="p-4 font-semibold text-slate-600">Memory</th>
                                <th className="p-4 font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {redisInstances.map(inst => (
                                <tr key={inst.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleSelectInstance(inst)}>
                                    <td className="p-4 flex items-center gap-3 text-slate-700"><DatabaseIcon /> {inst.name}</td>
                                    <td className="p-4"><StatusBadge status={inst.status} /></td>
                                    <td className="p-4 font-mono text-sm text-slate-500 truncate max-w-xs">{inst.domain}</td>
                                    <td className="p-4 text-slate-700">v{inst.redis_version}</td>
                                    <td className="p-4 text-slate-700">{(inst.max_memory / (1024 * 1024)).toFixed(0)} MB</td>
                                    <td className="p-4"><button onClick={(e) => { e.stopPropagation(); setRedisToDelete(inst); }} className="p-2 rounded-full bg-slate-100 hover:bg-red-500 text-slate-500 hover:text-white"><DeleteIcon /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
           ) : <div className="text-center py-10 bg-white rounded-lg border border-slate-200"><p className="text-slate-500">No Redis instances found. Create one to get started.</p></div>}
      </div>
  );

  const renderDashboardContent = () => {
    switch (dashboardView) {
        case 'landing':
            return <LandingPage onGetStarted={handleGetStarted} />;
        case 'organizations':
            return renderOrganizations();
        case 'instances':
            if (selectedOrg) return renderRedisInstances();
            // Fallback if selectedOrg is missing
            return renderOrganizations();
        case 'details':
            if (selectedOrg && selectedInstance) {
                return <InstanceDetailsView 
                        selectedInstance={selectedInstance}
                        selectedOrg={selectedOrg}
                        onBack={handleBack}
                      />;
            }
            // Fallback
            return renderRedisInstances();
        default:
             return <LandingPage onGetStarted={handleGetStarted} />;
    }
  }
  
  const formFieldClasses = "w-full p-2 bg-slate-100 border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";
  
  return (
    <div className="flex flex-col min-h-screen">
      {renderHeader()}
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div key={currentView} className="animate-fadeInUp">
            {currentView === 'dashboard' && (
                <div key={animation.key} className={animation.class}>
                   {renderDashboardContent()}
                </div>
            )}
            {currentView === 'docs' && <DocsPage />}
            {currentView === 'guides' && <UserGuidesPage onNavigate={handleNavigate} />}
            {currentView === 'terms' && <TermsOfServicePage />}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-8">
          <div className="container mx-auto text-center text-slate-500 text-sm">
              <p>&copy; {new Date().getFullYear()} RedisGate. All rights reserved.</p>
          </div>
      </footer>

      {/* --- Modals --- */}
      <Modal isOpen={isCreateOrgModalOpen} onClose={() => setCreateOrgModalOpen(false)} title="Create New Organization">
          <form onSubmit={handleCreateOrg} className="space-y-4">
              <input type="text" placeholder="Organization Name" value={newOrgData.name} onChange={e => setNewOrgData({...newOrgData, name: e.target.value})} className={formFieldClasses} required />
              <textarea placeholder="Description" value={newOrgData.description} onChange={e => setNewOrgData({...newOrgData, description: e.target.value})} className={formFieldClasses} rows={3}></textarea>
              <button type="submit" disabled={loading === 'create-org'} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400 transition-colors">
                  {loading === 'create-org' ? 'Creating...' : 'Create Organization'}
              </button>
              {error && loading === 'create-org' && <p className="text-sm text-red-700 text-center mt-2">{error}</p>}
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
              {error && loading === 'edit-org' && <p className="text-sm text-red-700 text-center mt-2">{error}</p>}
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
                  <label htmlFor="persistence_enabled" className="text-slate-700">Enable Persistence</label>
                  <input type="checkbox" id="persistence_enabled" checked={newRedisData.persistence_enabled} onChange={e => setNewRedisData({...newRedisData, persistence_enabled: e.target.checked})} className="h-5 w-5 rounded bg-slate-100 border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white" />
              </div>
              <div className="flex items-center justify-between">
                  <label htmlFor="backup_enabled" className="text-slate-700">Enable Backups</label>
                  <input type="checkbox" id="backup_enabled" checked={newRedisData.backup_enabled} onChange={e => setNewRedisData({...newRedisData, backup_enabled: e.target.checked})} className="h-5 w-5 rounded bg-slate-100 border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white" />
              </div>
              <button type="submit" disabled={loading === 'create-redis'} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400 !mt-6">
                  {loading === 'create-redis' ? 'Creating...' : 'Create Instance'}
              </button>
              {error && loading === 'create-redis' && <p className="text-sm text-red-700 text-center mt-2">{error}</p>}
          </form>
      </Modal>

      <ConfirmationModal isOpen={!!redisToDelete} onClose={() => setRedisToDelete(null)} onConfirm={handleDeleteRedis} title="Delete Redis Instance" message={`Are you sure you want to delete "${redisToDelete?.name}"? This action is permanent.`} isLoading={loading === 'delete-redis'} confirmText="Delete" />
      
      <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ isOpen: false, title: '', message: '' })}
          title={alertModal.title}
          message={alertModal.message}
      />
    </div>
  );
};

export default Dashboard;