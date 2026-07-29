import { useNavigate } from 'react-router-dom'
import { AgencyFormFields } from '../components/AgencyFormFields'
import { ScreenTitle } from '../components/ui'
import { useInsertAgency } from '../lib/queries'

export function AgencyNew() {
  const navigate = useNavigate()
  const insert = useInsertAgency()

  return (
    <>
      <ScreenTitle>New agency</ScreenTitle>
      <AgencyFormFields
        submitLabel="Add agency"
        pending={insert.isPending}
        error={insert.error}
        onSubmit={(values) =>
          insert.mutate(values, {
            onSuccess: (agency) => navigate(`/agencies/${agency.id}`),
          })
        }
      />
    </>
  )
}
