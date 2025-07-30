import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function ProjectTasksTable({ tasks, priorityColor }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assigned To</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map(task => (
          <TableRow key={task.id}>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell>
              <Badge variant="outline">{task.status}</Badge>
            </TableCell>
            <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</TableCell>
            <TableCell>
              <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
            </TableCell>
            <TableCell>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.image} />
                    <AvatarFallback>{task.assignee.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <span>{task.assignee.name}</span>
                </div>
              ) : (
                '-'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
