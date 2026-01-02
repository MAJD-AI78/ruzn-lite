import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Key, 
  Mail,
  Shield,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function AccessManagement() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('pending');
  
  const { data: stats, refetch: refetchStats } = trpc.access.getStats.useQuery();
  const { data: pendingRequests, refetch: refetchPending } = trpc.access.listRequests.useQuery({ status: 'pending' });
  const { data: allRequests, refetch: refetchAll } = trpc.access.listRequests.useQuery({ status: 'all' });
  const { data: activeCodes, refetch: refetchCodes } = trpc.access.listCodes.useQuery({});
  
  const approveMutation = trpc.access.approveRequest.useMutation({
    onSuccess: (data) => {
      toast.success(`Access approved! Code: ${data.code}`);
      refetchPending();
      refetchAll();
      refetchStats();
      refetchCodes();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    }
  });
  
  const denyMutation = trpc.access.denyRequest.useMutation({
    onSuccess: () => {
      toast.success('Request denied');
      refetchPending();
      refetchAll();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Failed to deny: ${error.message}`);
    }
  });

  const handleApprove = (requestId: number) => {
    approveMutation.mutate({ requestId, expirationHours: 72 });
  };

  const handleDeny = (requestId: number, reason?: string) => {
    denyMutation.mutate({ requestId, reason });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <Card className="bg-[#1a1a1a] border-red-500/30 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-gray-400">
              You do not have permission to access this page. Admin privileges required.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#c9a227]">Access Management</h1>
            <p className="text-gray-400 mt-1">Manage platform access requests and codes</p>
          </div>
          <Button 
            variant="outline" 
            className="border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/10"
            onClick={() => {
              refetchStats();
              refetchPending();
              refetchAll();
              refetchCodes();
              toast.success('Data refreshed');
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a1a1a] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.requests?.total || 0}</p>
                  <p className="text-xs text-gray-400">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a1a1a] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.requests?.pending || 0}</p>
                  <p className="text-xs text-gray-400">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a1a1a] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.requests?.approved || 0}</p>
                  <p className="text-xs text-gray-400">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a1a1a] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Key className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.codes?.active || 0}</p>
                  <p className="text-xs text-gray-400">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="bg-[#1a1a1a] border border-[#333]">
            <TabsTrigger value="pending" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-black">
              Pending ({stats?.requests?.pending || 0})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-black">
              All Requests
            </TabsTrigger>
            <TabsTrigger value="codes" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-black">
              Active Codes
            </TabsTrigger>
          </TabsList>

          {/* Pending Requests Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingRequests?.length === 0 ? (
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-400">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests?.map((request) => (
                <Card key={request.id} className="bg-[#1a1a1a] border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{request.name}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Mail className="w-4 h-4" />
                          {request.email}
                        </div>
                        {request.organization && (
                          <p className="text-sm text-gray-400">Organization: {request.organization}</p>
                        )}
                        {request.reason && (
                          <p className="text-sm text-gray-400">Reason: {request.reason}</p>
                        )}
                        <p className="text-xs text-gray-500">Requested: {formatDate(request.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDeny(request.id)}
                          disabled={denyMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* All Requests Tab */}
          <TabsContent value="all" className="space-y-4">
            {allRequests?.length === 0 ? (
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No access requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0d0d0d] border-b border-[#333]">
                        <tr>
                          <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Organization</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRequests?.map((request) => (
                          <tr key={request.id} className="border-b border-[#333] hover:bg-[#222]">
                            <td className="p-4 text-white">{request.name}</td>
                            <td className="p-4 text-gray-400">{request.email}</td>
                            <td className="p-4 text-gray-400">{request.organization || '-'}</td>
                            <td className="p-4">{getStatusBadge(request.status)}</td>
                            <td className="p-4 text-gray-400 text-sm">{formatDate(request.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Codes Tab */}
          <TabsContent value="codes" className="space-y-4">
            {activeCodes?.length === 0 ? (
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-8 text-center">
                  <Key className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No active access codes</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0d0d0d] border-b border-[#333]">
                        <tr>
                          <th className="text-left p-4 text-gray-400 font-medium">Code</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Expires</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCodes?.map((code) => (
                          <tr key={code.id} className="border-b border-[#333] hover:bg-[#222]">
                            <td className="p-4">
                              <code className="bg-[#0d0d0d] px-2 py-1 rounded text-[#c9a227] font-mono">
                                {code.code}
                              </code>
                            </td>
                            <td className="p-4">
                              {code.isUsed ? (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30">
                                  Used
                                </Badge>
                              ) : new Date(code.expiresAt) < new Date() ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                                  Active
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-gray-400 text-sm">{formatDate(code.expiresAt)}</td>
                            <td className="p-4 text-gray-400 text-sm">{formatDate(code.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Banner */}
        <Card className="bg-[#1a1a1a] border-[#c9a227]/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#c9a227] mt-0.5" />
              <div>
                <p className="text-[#c9a227] font-medium">Access Request Workflow</p>
                <p className="text-gray-400 text-sm mt-1">
                  When you approve a request, a unique access code (RZN-XXXXXXXX) is generated and emailed to the user. 
                  Codes expire after 72 hours by default and can only be used once.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
