import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { backendSupports } from '@/shared/lib/api/capabilities';
import {
  CATEGORY_LABELS,
  SERVICE_LABELS,
  type IncidentCategory,
  type ServiceName,
} from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { formatDuration } from '@/shared/lib/date';
import { applyServerFieldErrors } from '@/shared/lib/forms';
import { toApiError } from '@/shared/lib/http/errors';
import {
  Button,
  Card,
  Field,
  InlineAlert,
  Input,
  PageHeader,
  Select,
  Textarea,
  toOptions,
  TraceReference,
  useToast,
} from '@/shared/ui';
import { AiSuggestionPanel } from '../components/AiSuggestionPanel';
import {
  EnvironmentField,
  PlaceFields,
  PriorityField,
  SeverityField,
} from '../components/IncidentFields';
import { useCreateIncident, useSlaPolicy } from '../hooks';
import { createIncidentSchema, type CreateIncidentInput } from '../types';

function SlaPreview({ priority }: { priority: CreateIncidentInput['priority'] }) {
  const policy = useSlaPolicy();
  const rule = policy.data?.find((row) => row.priority === priority);
  if (!rule) return null;
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h2 className="text-sm font-semibold text-ink">The SLA for this priority</h2>
      <p className="text-label text-ink2">
        Assign within <b className="text-ink">{formatDuration(rule.assignWithinSeconds)}</b>
      </p>
      <p className="text-label text-ink2">
        Resolve within <b className="text-ink">{formatDuration(rule.resolveWithinSeconds)}</b>
      </p>
    </Card>
  );
}

export default function NewIncidentPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateIncident();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
      environment: 'PRODUCTION',
      location: '',
      affectedSource: '',
    },
  });
  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const priority = useWatch({ control, name: 'priority' });
  const category = useWatch({ control, name: 'category' });
  const serviceName = useWatch({ control, name: 'serviceName' });
  const failure = create.error ? toApiError(create.error) : null;

  const onSubmit = handleSubmit((values) => {
    create.mutate(values, {
      onSuccess: ({ incidentId }) => {
        toast({ title: 'Incident created', description: 'The assignment SLA is now running.' });
        void navigate(ROUTES.incident(incidentId));
      },
      onError: (error) => {
        applyServerFieldErrors(
          toApiError(error).fieldErrors,
          [
            'title',
            'description',
            'severity',
            'priority',
            'environment',
            'serviceName',
            'category',
            'location',
            'affectedSource',
          ],
          setError,
        );
      },
    });
  });

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-label text-ink3">
        <Link to={ROUTES.incidents} className="font-medium hover:underline">
          Incidents
        </Link>
        <ChevronRight aria-hidden="true" className="size-3.5" />
        <span className="text-ink2">New</span>
      </nav>
      <PageHeader
        title="Report an incident"
        description="Tell us what is wrong. The SLA clock starts the moment you submit."
      />

      {failure && (
        <InlineAlert tone="error" title="Could not create the incident">
          {failure.message}
          {failure.traceId && <TraceReference traceId={failure.traceId} className="mt-1 flex" />}
        </InlineAlert>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-1 basis-160">
          <form noValidate onSubmit={(event) => void onSubmit(event)}>
            <section className="flex flex-col gap-4.5 border-b border-line p-6">
              <h2 className="text-base font-semibold text-ink">What happened</h2>
              <Field
                label="Title"
                required
                count={title.length}
                maxLength={255}
                error={errors.title?.message}
              >
                {(aria) => (
                  <Input
                    {...aria}
                    {...register('title')}
                    placeholder="A short summary of the problem"
                  />
                )}
              </Field>
              <Field
                label="Description"
                required
                count={description.length}
                maxLength={2000}
                error={errors.description?.message}
              >
                {(aria) => (
                  <Textarea
                    {...aria}
                    {...register('description')}
                    rows={5}
                    placeholder="What are people seeing? When did it start? What changed?"
                  />
                )}
              </Field>
            </section>
            <section className="flex flex-col gap-4.5 border-b border-line p-6">
              <h2 className="text-base font-semibold text-ink">How serious is it</h2>
              <SeverityField control={control} />
              <PriorityField control={control} />
            </section>
            <section className="flex flex-col gap-4.5 p-6">
              <h2 className="text-base font-semibold text-ink">Where is it happening</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <EnvironmentField control={control} />
                <Controller
                  control={control}
                  name="serviceName"
                  render={({ field }) => (
                    <Field
                      label="Service"
                      required
                      error={errors.serviceName && 'Choose a service'}
                    >
                      {(aria) => (
                        <Select<ServiceName>
                          {...aria}
                          ref={field.ref}
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Choose a service"
                          options={toOptions<ServiceName>(SERVICE_LABELS)}
                        />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Field label="Category" required error={errors.category && 'Choose a category'}>
                      {(aria) => (
                        <Select<IncidentCategory>
                          {...aria}
                          ref={field.ref}
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Choose a category"
                          options={toOptions<IncidentCategory>(CATEGORY_LABELS)}
                        />
                      )}
                    </Field>
                  )}
                />
                <PlaceFields register={register} errors={errors} />
              </div>
            </section>
            <div className="flex flex-wrap justify-end gap-2.5 rounded-b-card border-t border-line bg-sunken px-6 py-4">
              <Button asChild>
                <Link to={ROUTES.incidents}>Cancel</Link>
              </Button>
              <Button type="submit" variant="primary" loading={create.isPending}>
                Create incident
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex min-w-0 flex-1 basis-75 flex-col gap-5">
          <AiSuggestionPanel
            input={
              title.trim() && description.trim()
                ? { title, description, category, serviceName }
                : null
            }
          />
          {backendSupports('slaPolicy') && <SlaPreview priority={priority} />}
        </div>
      </div>
    </div>
  );
}
