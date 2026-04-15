const AUDIT_ACTION_LABELS: Record<string, string> = {
  'candidate.viewed':             'Viewed candidate profile',
  'candidate.created':            'Created candidate',
  'candidate.updated':            'Updated candidate',
  'candidate.soft_deleted':       'Soft-deleted candidate',
  'candidate.hard_deleted':       'Permanently deleted candidate',
  'candidate.anonymised':         'Anonymised candidate data',
  'candidate.restored':           'Restored candidate',
  'candidate.stage_changed':      'Changed pipeline stage',
  'candidate.privacy_notice_sent':'Sent privacy notice',
  'candidate.privacy_updated':    'Updated privacy settings',
  'cv.accessed':                  'Accessed CV',
  'cv.uploaded':                  'Uploaded / parsed CV',
  'feedback.created':             'Submitted interview feedback',
  'feedback.updated':             'Updated interview feedback',
  'rights_request.created':       'Created rights request',
  'rights_request.fulfilled':     'Fulfilled rights request',
  'rights_request.export_downloaded': 'Downloaded rights export',
  'rights_request.rejected':      'Rejected rights request',
  'retention.review_run':         'Ran retention review',
  'user.login':                   'Logged in',
  'user.logout':                  'Logged out',
};

export function getActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
