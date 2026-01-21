import { useState, useEffect } from 'react';
import { getSubscribers, deleteSubscriber } from '../../lib/api';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip
} from "@heroui/react";
import { toast } from 'sonner';
import type { Subscriber } from '../../lib/types';

export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscribers = async () => {
    try {
      const data = await getSubscribers();
      setSubscribers(data);
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;
    try {
      await deleteSubscriber(id);
      fetchSubscribers();
      toast.success('Subscriber deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete subscriber');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Subscribers.</h1>
      </div>

      {subscribers.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center text-default-500">
          <p className="text-default-500">No subscribers yet.</p>
        </div>
      ) : (
        <div className="border border-default-200 rounded-xl overflow-hidden shadow-sm">
          <Table removeWrapper aria-label="Subscribers table">
            <TableHeader>
              <TableColumn>Email</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Subscribed</TableColumn>
              <TableColumn align="end">Actions</TableColumn>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.email}</TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={sub.verified ? "success" : "warning"}
                      variant="flat"
                    >
                      {sub.verified ? 'Verified' : 'Pending'}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-sm">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="light"
                        size="sm"
                        color="danger"
                        onPress={() => handleDelete(sub.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
