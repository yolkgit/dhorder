'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Users, Package, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

// 품목 타입 정의
type Item = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// 사용자 타입 정의
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchName: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // 상태 관리
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  
  // 품목 관련 상태
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isItemDeleteDialogOpen, setIsItemDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  const [isItemSubmitting, setIsItemSubmitting] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isDeleteItemLoading, setIsDeleteItemLoading] = useState(false);
  
  // 사용자 관련 상태
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'BRANCH', branchName: '' });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleteUserLoading, setIsDeleteUserLoading] = useState(false);
  
  // 세션 확인 및 권한 체크
  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        toast.error('관리자만 접근할 수 있는 페이지입니다.');
        router.push('/');
      } else {
        // 품목 목록 로드
        fetchItems();
        // 사용자 목록 로드
        fetchUsers();
      }
    } else if (status === 'unauthenticated') {
      toast.error('로그인이 필요합니다.');
      router.push('/login');
    }
  }, [status, session, router]);
  
  // 품목 목록 불러오기
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      setIsItemsLoading(true);
      console.log('품목 목록 조회 요청 시작');
      
      const response = await fetch('/api/items', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      console.log('품목 목록 조회 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('품목 목록 조회 실패 - 응답:', errorText);
        throw new Error(`품목 목록을 불러오는데 실패했습니다. 상태 코드: ${response.status}`);
      }
      
      let data;
      try {
        const text = await response.text();
        console.log('품목 목록 조회 응답 텍스트:', text);
        
        if (!text || text.trim() === '') {
          console.error('품목 목록 조회 - 빈 응답 받음');
          throw new Error('서버에서 빈 응답을 반환했습니다.');
        }
        
        try {
          data = JSON.parse(text);
          console.log('품목 목록 조회 응답 데이터:', data);
        } catch (jsonError) {
          console.error('품목 목록 조회 - JSON 파싱 오류:', jsonError, '원본 텍스트:', text);
          throw new Error('서버 응답을 JSON으로 파싱하는데 실패했습니다.');
        }
      } catch (parseError) {
        console.error('품목 목록 조회 응답 파싱 오류:', parseError);
        throw new Error('서버 응답을 처리하는데 실패했습니다.');
      }
      
      if (!data.success && data.error) {
        console.error('품목 목록 조회 - 서버 오류:', data.error, data.details || '');
        throw new Error(data.error);
      }
      
      if (!data.items || !Array.isArray(data.items)) {
        console.warn('품목 목록 조회 - 유효하지 않은 응답 형식:', data);
        setItems([]);
        return;
      }
      
      console.log(`품목 목록 조회 성공 - ${data.items.length}개 항목`);
      setItems(data.items);
    } catch (error: any) {
      console.error('품목 목록 조회 오류:', error);
      toast.error(error.message || '품목 목록을 불러오는데 실패했습니다.');
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsItemsLoading(false);
    }
  };
  
  // 사용자 목록 불러오기
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('사용자 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 품목 추가 함수
  const handleAddItem = async () => {
    try {
      setIsItemSubmitting(true);
      
      if (!newItem.name.trim()) {
        toast.error('품목명은 필수 입력 항목입니다.');
        setIsItemSubmitting(false);
        return;
      }
      
      console.log('품목 추가 요청 데이터:', newItem);
      
      // 중복 품목명 확인
      try {
        const existingItems = await fetch('/api/items');
        
        if (!existingItems.ok) {
          throw new Error('품목 목록을 불러오는데 실패했습니다.');
        }
        
        const itemsData = await existingItems.json();
        
        if (itemsData.items && Array.isArray(itemsData.items)) {
          const duplicate = itemsData.items.find(
            (item: any) => item.name.toLowerCase() === newItem.name.toLowerCase()
          );
          
          if (duplicate) {
            toast.error('이미 존재하는 품목명입니다.');
            setIsItemSubmitting(false);
            return;
          }
        }
      } catch (error) {
        console.error('품목 목록 조회 오류:', error);
        // 중복 확인 실패 시에도 계속 진행 (서버에서 다시 확인함)
      }
      
      try {
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newItem.name.trim(),
            description: newItem.description.trim() || null
          }),
        });
        
        let data;
        try {
          data = await response.json();
          console.log('품목 추가 응답:', data);
        } catch (parseError) {
          console.error('품목 추가 응답 파싱 오류:', parseError);
          throw new Error('서버 응답을 처리하는데 실패했습니다.');
        }
        
        if (!response.ok) {
          const errorMessage = data.error || '품목 추가에 실패했습니다.';
          const errorDetails = data.details ? ` (${data.details})` : '';
          throw new Error(`${errorMessage}${errorDetails}`);
        }
        
        toast.success('품목이 성공적으로 추가되었습니다.');
        setNewItem({ name: '', description: '' });
        setIsItemDialogOpen(false);
        fetchItems();
      } catch (error: any) {
        console.error('품목 추가 API 오류:', error);
        toast.error(error.message || '품목 추가 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('품목 추가 오류:', error);
      toast.error(error.message || '품목 추가 중 오류가 발생했습니다.');
    } finally {
      setIsItemSubmitting(false);
    }
  };
  
  // 품목 수정 핸들러
  const handleUpdateItem = async () => {
    try {
      setIsItemSubmitting(true);
      
      if (!editItem || !editItem.name.trim()) {
        toast.error('품목명을 입력해주세요.');
        setIsItemSubmitting(false);
        return;
      }
      
      console.log('품목 수정 요청 데이터:', editItem);
      
      const response = await fetch('/api/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editItem.id,
          name: editItem.name.trim(),
          description: editItem.description?.trim() || null
        }),
      });
      
      let data;
      try {
        data = await response.json();
        console.log('품목 수정 응답:', data);
      } catch (parseError) {
        console.error('품목 수정 응답 파싱 오류:', parseError);
        throw new Error('서버 응답을 처리하는데 실패했습니다.');
      }
      
      if (!response.ok) {
        const errorMessage = data.error || '품목 수정에 실패했습니다.';
        const errorDetails = data.details ? ` (${data.details})` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }
      
      toast.success('품목이 성공적으로 수정되었습니다.');
      setEditItem(null);
      setIsItemDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('품목 수정 오류:', error);
      toast.error(error.message || '품목 수정에 실패했습니다.');
    } finally {
      setIsItemSubmitting(false);
    }
  };
  
  // 품목 삭제 핸들러
  const handleDeleteItem = async () => {
    try {
      if (!deleteItemId) return;
      setIsDeleteItemLoading(true);
      
      const response = await fetch(`/api/items?id=${deleteItemId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.usageCount) {
          throw new Error(`이 품목은 ${data.usageCount}개의 주문에서 사용 중이므로 삭제할 수 없습니다.`);
        }
        throw new Error(data.error || '품목 삭제에 실패했습니다.');
      }
      
      toast.success('품목이 성공적으로 삭제되었습니다.');
      setDeleteItemId(null);
      fetchItems();
    } catch (error: any) {
      console.error('품목 삭제 오류:', error);
      toast.error(error.message || '품목 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteItemLoading(false);
    }
  };
  
  // 사용자 검색 핸들러
  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setUserSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const filtered = users.filter(
      user => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term) ||
        (user.branchName && user.branchName.toLowerCase().includes(term))
    );
    
    setFilteredUsers(filtered);
  };
  
  // 회원 추가 함수
  const handleAddUser = async () => {
    try {
      setIsUserSubmitting(true);
      
      // 필수 필드 검증
      if (!newUser.name.trim()) {
        toast.error('이름은 필수 입력 항목입니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      if (!newUser.email.trim()) {
        toast.error('아이디는 필수 입력 항목입니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      if (!newUser.password.trim()) {
        toast.error('비밀번호는 필수 입력 항목입니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      // 아이디 형식 검증 (영문, 숫자만 허용)
      const usernameRegex = /^[a-zA-Z0-9]+$/;
      if (!usernameRegex.test(newUser.email)) {
        toast.error('아이디는 영문과 숫자로만 구성되어야 합니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUser.name.trim(),
          email: newUser.email.trim(),
          password: newUser.password.trim(),
          role: newUser.role,
          branchName: newUser.branchName.trim() || null,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회원 추가에 실패했습니다.');
      }
      
      toast.success('회원이 성공적으로 추가되었습니다.');
      setNewUser({ name: '', email: '', password: '', role: 'BRANCH', branchName: '' });
      setIsUserDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('회원 추가 오류:', error);
      toast.error(error.message || '회원 추가 중 오류가 발생했습니다.');
    } finally {
      setIsUserSubmitting(false);
    }
  };
  
  // 회원 수정 함수
  const handleUpdateUser = async () => {
    try {
      setIsUserSubmitting(true);
      
      if (!editUser) return;
      
      // 필수 필드 검증
      if (!editUser.name.trim()) {
        toast.error('이름은 필수 입력 항목입니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      if (!editUser.email.trim()) {
        toast.error('아이디는 필수 입력 항목입니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      // 아이디 형식 검증 (영문, 숫자만 허용)
      const usernameRegex = /^[a-zA-Z0-9]+$/;
      if (!usernameRegex.test(editUser.email)) {
        toast.error('아이디는 영문과 숫자로만 구성되어야 합니다.');
        setIsUserSubmitting(false);
        return;
      }
      
      const userData: any = {
        id: editUser.id,
        name: editUser.name.trim(),
        email: editUser.email.trim(),
        role: editUser.role,
        branchName: editUser.branchName?.trim() || null,
      };
      
      // 비밀번호가 있는 경우에만 포함
      if ((editUser as any).password && (editUser as any).password.trim()) {
        userData.password = (editUser as any).password.trim();
      }
      
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회원 수정에 실패했습니다.');
      }
      
      toast.success('회원 정보가 성공적으로 수정되었습니다.');
      setEditUser(null);
      setIsUserDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('회원 수정 오류:', error);
      toast.error(error.message || '회원 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUserSubmitting(false);
    }
  };
  
  // 회원 삭제 함수
  const handleDeleteUser = async () => {
    try {
      if (!deleteUserId) return;
      setIsDeleteUserLoading(true);
      
      const response = await fetch(`/api/users?id=${deleteUserId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회원 삭제에 실패했습니다.');
      }
      
      toast.success('회원이 성공적으로 삭제되었습니다.');
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('회원 삭제 오류:', error);
      toast.error(error.message || '회원 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteUserLoading(false);
    }
  };
  
  // 로딩 중 표시
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">로딩 중...</p>
        </div>
      </div>
    );
  }
  
  // 관리자가 아닌 경우 접근 제한
  if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">접근 제한</h1>
          <p className="mb-4">관리자만 접근할 수 있는 페이지입니다.</p>
          <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">관리자 페이지</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            품목 관리
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            회원 관리
          </TabsTrigger>
        </TabsList>
        
        {/* 품목 관리 탭 */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>품목 목록</CardTitle>
              <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditItem(null);
                      setNewItem({ name: '', description: '' });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    품목 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editItem ? '품목 수정' : '품목 추가'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label htmlFor="itemName" className="text-sm font-medium">
                        품목명 *
                      </label>
                      <Input
                        id="itemName"
                        placeholder="품목명 입력"
                        value={editItem ? editItem.name : newItem.name}
                        onChange={(e) => 
                          editItem 
                            ? setEditItem({ ...editItem, name: e.target.value })
                            : setNewItem({ ...newItem, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="itemDescription" className="text-sm font-medium">
                        설명
                      </label>
                      <Textarea
                        id="itemDescription"
                        placeholder="품목 설명 입력"
                        value={editItem ? editItem.description || '' : newItem.description}
                        onChange={(e) => 
                          editItem 
                            ? setEditItem({ ...editItem, description: e.target.value })
                            : setNewItem({ ...newItem, description: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">취소</Button>
                    </DialogClose>
                    <Button 
                      onClick={editItem ? handleUpdateItem : handleAddItem}
                      disabled={isItemSubmitting}
                    >
                      {isItemSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          처리 중...
                        </>
                      ) : (
                        editItem ? '수정' : '추가'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isItemsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 품목이 없습니다.
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">품목명</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead className="w-[150px]">등록일</TableHead>
                        <TableHead className="w-[120px] text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditItem(item);
                                  setIsItemDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteItemId(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>품목 삭제</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      정말로 "{item.name}" 품목을 삭제하시겠습니까?
                                      <br />
                                      주문에서 사용 중인 품목은 삭제할 수 없습니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeleteItemId(null)}>
                                      취소
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteItem}
                                      disabled={isDeleteItemLoading}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      {isDeleteItemLoading ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          처리 중...
                                        </>
                                      ) : (
                                        '삭제'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 회원 관리 탭 */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>회원 목록</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="이름, 아이디, 지점명 검색"
                    value={userSearchTerm}
                    onChange={handleUserSearch}
                    className="pl-8"
                  />
                </div>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditUser(null);
                        setNewUser({ name: '', email: '', password: '', role: 'BRANCH', branchName: '' });
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      회원 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editUser ? '회원 정보 수정' : '회원 추가'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="userName" className="text-sm font-medium">
                          이름 *
                        </label>
                        <Input
                          id="userName"
                          placeholder="이름 입력"
                          value={editUser ? editUser.name : newUser.name}
                          onChange={(e) => 
                            editUser 
                              ? setEditUser({ ...editUser, name: e.target.value })
                              : setNewUser({ ...newUser, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="userEmail" className="text-sm font-medium">
                          아이디 *
                        </label>
                        <Input
                          id="userEmail"
                          type="text"
                          placeholder="아이디 입력 (영문, 숫자만 사용 가능)"
                          value={editUser ? editUser.email : newUser.email}
                          onChange={(e) => 
                            editUser 
                              ? setEditUser({ ...editUser, email: e.target.value })
                              : setNewUser({ ...newUser, email: e.target.value })
                          }
                        />
                        <p className="text-xs text-gray-500">영문, 숫자로만 구성된 아이디를 입력하세요.</p>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="userPassword" className="text-sm font-medium">
                          비밀번호 {editUser ? '(변경 시에만 입력)' : '*'}
                        </label>
                        <Input
                          id="userPassword"
                          type="password"
                          placeholder={editUser ? '비밀번호 변경 시에만 입력' : '비밀번호 입력'}
                          value={editUser ? (editUser as any).password || '' : newUser.password}
                          onChange={(e) => 
                            editUser 
                              ? setEditUser({ ...editUser, password: e.target.value } as any)
                              : setNewUser({ ...newUser, password: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="userRole" className="text-sm font-medium">
                          역할
                        </label>
                        <select
                          id="userRole"
                          className="w-full border rounded p-2"
                          value={editUser ? editUser.role : newUser.role}
                          onChange={(e) => 
                            editUser 
                              ? setEditUser({ ...editUser, role: e.target.value })
                              : setNewUser({ ...newUser, role: e.target.value })
                          }
                        >
                          <option value="BRANCH">지점</option>
                          <option value="ADMIN">관리자</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="userBranchName" className="text-sm font-medium">
                          지점명
                        </label>
                        <Input
                          id="userBranchName"
                          placeholder="지점명 입력"
                          value={editUser ? editUser.branchName || '' : newUser.branchName}
                          onChange={(e) => 
                            editUser 
                              ? setEditUser({ ...editUser, branchName: e.target.value })
                              : setNewUser({ ...newUser, branchName: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">취소</Button>
                      </DialogClose>
                      <Button 
                        onClick={editUser ? handleUpdateUser : handleAddUser}
                        disabled={isUserSubmitting}
                      >
                        {isUserSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            처리 중...
                          </>
                        ) : (
                          editUser ? '수정' : '추가'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {userSearchTerm ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>아이디</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>지점명</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'ADMIN' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role === 'ADMIN' ? '관리자' : '지점'}
                          </span>
                        </TableCell>
                        <TableCell>{user.branchName || '-'}</TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditUser({
                                  ...user,
                                  password: '', // 비밀번호 필드 초기화
                                } as any);
                                setIsUserDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteUserId(user.id)}
                                  disabled={session?.user?.id === user.id} // 자기 자신은 삭제 불가
                                >
                                  <Trash2 className={`h-4 w-4 ${session?.user?.id === user.id ? 'text-gray-300' : 'text-red-500'}`} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>회원 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    정말로 "{user.name}" 회원을 삭제하시겠습니까?
                                    <br />
                                    주문을 작성한 회원은 삭제할 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteUserId(null)}>
                                    취소
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteUser}
                                    disabled={isDeleteUserLoading}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    {isDeleteUserLoading ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        처리 중...
                                      </>
                                    ) : (
                                      '삭제'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 