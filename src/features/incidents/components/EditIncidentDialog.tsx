import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { applyServerFieldErrors } from '@/shared/lib/forms';
import { toApiError } from '@/shared/lib/http/errors';
import {
  Button,
  Dialog,
  Field,
  InlineAlert,
  Input,
  Textarea,
  TraceReference,
  useToast,
} from '@/shared/ui';
import { useUpdateIncident } from '../hooks';
import {
  createIncidentSchema,
  updateIncidentSchema,
  type CreateIncidentInput,
  type Incident,
} from '../types';
import { EnvironmentField, PlaceFields, PriorityField, SeverityField } from './IncidentFields';

export interface EditIncidentDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIncidentDialog({ incident, open, onOpenChange }: EditIncidentDialogProps) {
  const toast = useToast();
  const update = useUpdateIncident(incident.id);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: incident.title,
      description: incident.description ?? '',
      severity: incident.severity,
      priority: incident.priority,
      environment: incident.environment ?? 'OTHERS',
      // Read-only on the backend. Kept so the shared form checks pass; the API call leaves them out.
      serviceName: incident.serviceName ?? 'OTHERS',
      category: incident.category ?? 'OTHER',
      location: incident.location ?? '',
      affectedSource: incident.affectedSource ?? '',
    },
  });
  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const failure = update.error ? toApiError(update.error) : null;

  const onSubmit = handleSubmit((values) => {
    // Parsing drops service and category, which the backend's update does not accept.
    update.mutate(updateIncidentSchema.parse(values), {
      onSuccess: () => {
        toast({ title: 'Incident updated' });
        onOpenChange(false);
      },
      onError: (error) => {
        applyServerFieldErrors(
          toApiError(error).fieldErrors,
          ['title', 'description', 'location', 'affectedSource'],
          setError,
        );
      },
    });
  });

  return (
    <Dialog
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title="Edit incident"
      description="Service and category cannot be changed after an incident is created."
      footer={
        <>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-incident" variant="primary" loading={update.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-incident"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => void onSubmit(event)}
      >
        {failure && (
          <InlineAlert tone="error">
            {failure.message}
            {failure.traceId && <TraceReference traceId={failure.traceId} className="mt-1 flex" />}
          </InlineAlert>
        )}
        <Field
          label="Title"
          required
          count={title.length}
          maxLength={255}
          error={errors.title?.message}
        >
          {(aria) => <Input {...aria} {...register('title')} />}
        </Field>
        <Field
          label="Description"
          required
          count={description.length}
          maxLength={2000}
          error={errors.description?.message}
        >
          {(aria) => <Textarea {...aria} {...register('description')} rows={5} />}
        </Field>
        <SeverityField control={control} />
        <PriorityField control={control} />
        <EnvironmentField control={control} />
        <PlaceFields register={register} errors={errors} />
      </form>
    </Dialog>
  );
}
