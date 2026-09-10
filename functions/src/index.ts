import * as admin from 'firebase-admin'
import { webhookSync } from './appointments/webhookSync'

admin.initializeApp()

export { webhookSync }
