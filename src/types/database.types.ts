export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      ApiKey: {
        Row: {
          createdAt: string
          expiresAt: string | null
          id: string
          keyHash: string
          keyPrefix: string
          lastUsedAt: string | null
          name: string
          revokedAt: string | null
          scopes: string[]
          userId: string
        }
        Insert: {
          createdAt?: string
          expiresAt?: string | null
          id?: string
          keyHash: string
          keyPrefix: string
          lastUsedAt?: string | null
          name: string
          revokedAt?: string | null
          scopes?: string[]
          userId: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string | null
          id?: string
          keyHash?: string
          keyPrefix?: string
          lastUsedAt?: string | null
          name?: string
          revokedAt?: string | null
          scopes?: string[]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ApiKey_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ApiKeyIpWhitelist: {
        Row: {
          apiKeyId: string
          createdAt: string
          description: string | null
          id: string
          ipAddress: string
        }
        Insert: {
          apiKeyId: string
          createdAt?: string
          description?: string | null
          id?: string
          ipAddress: string
        }
        Update: {
          apiKeyId?: string
          createdAt?: string
          description?: string | null
          id?: string
          ipAddress?: string
        }
        Relationships: [
          {
            foreignKeyName: "ApiKeyIpWhitelist_apiKeyId_fkey"
            columns: ["apiKeyId"]
            isOneToOne: false
            referencedRelation: "ApiKey"
            referencedColumns: ["id"]
          },
        ]
      }
      ApiRateLimit: {
        Row: {
          apiKeyId: string
          endpoint: string
          id: string
          requestCount: number
          windowStart: string
        }
        Insert: {
          apiKeyId: string
          endpoint: string
          id?: string
          requestCount?: number
          windowStart: string
        }
        Update: {
          apiKeyId?: string
          endpoint?: string
          id?: string
          requestCount?: number
          windowStart?: string
        }
        Relationships: [
          {
            foreignKeyName: "ApiRateLimit_apiKeyId_fkey"
            columns: ["apiKeyId"]
            isOneToOne: false
            referencedRelation: "ApiKey"
            referencedColumns: ["id"]
          },
        ]
      }
      ApiRequestLog: {
        Row: {
          apiKeyId: string | null
          createdAt: string
          endpoint: string
          id: string
          ipAddress: string | null
          method: string
          requestBody: Json | null
          responseBody: Json | null
          responseTime: number | null
          statusCode: number
          userAgent: string | null
        }
        Insert: {
          apiKeyId?: string | null
          createdAt?: string
          endpoint: string
          id?: string
          ipAddress?: string | null
          method: string
          requestBody?: Json | null
          responseBody?: Json | null
          responseTime?: number | null
          statusCode: number
          userAgent?: string | null
        }
        Update: {
          apiKeyId?: string | null
          createdAt?: string
          endpoint?: string
          id?: string
          ipAddress?: string | null
          method?: string
          requestBody?: Json | null
          responseBody?: Json | null
          responseTime?: number | null
          statusCode?: number
          userAgent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ApiRequestLog_apiKeyId_fkey"
            columns: ["apiKeyId"]
            isOneToOne: false
            referencedRelation: "ApiKey"
            referencedColumns: ["id"]
          },
        ]
      }
      BillingAddress: {
        Row: {
          city: string
          country: string
          createdAt: string
          firstName: string
          id: string
          isDefault: boolean
          lastName: string
          postalCode: string
          state: string
          streetAddress: string
          streetAddress2: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          city: string
          country?: string
          createdAt?: string
          firstName: string
          id?: string
          isDefault?: boolean
          lastName: string
          postalCode: string
          state: string
          streetAddress: string
          streetAddress2?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          city?: string
          country?: string
          createdAt?: string
          firstName?: string
          id?: string
          isDefault?: boolean
          lastName?: string
          postalCode?: string
          state?: string
          streetAddress?: string
          streetAddress2?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_billing_address_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditLog: {
        Row: {
          action: string
          createdAt: string
          entityId: string | null
          entityType: string
          id: string
          ipAddress: string | null
          metadata: Json | null
          userAgent: string | null
          userId: string | null
        }
        Insert: {
          action: string
          createdAt?: string
          entityId?: string | null
          entityType: string
          id?: string
          ipAddress?: string | null
          metadata?: Json | null
          userAgent?: string | null
          userId?: string | null
        }
        Update: {
          action?: string
          createdAt?: string
          entityId?: string | null
          entityType?: string
          id?: string
          ipAddress?: string | null
          metadata?: Json | null
          userAgent?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Certification: {
        Row: {
          createdAt: string
          credentialId: string | null
          credentialUrl: string | null
          expiryDate: string | null
          id: string
          issueDate: string | null
          issuer: string
          name: string
          order: number
          profileId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          credentialId?: string | null
          credentialUrl?: string | null
          expiryDate?: string | null
          id: string
          issueDate?: string | null
          issuer: string
          name: string
          order?: number
          profileId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          credentialId?: string | null
          credentialUrl?: string | null
          expiryDate?: string | null
          id?: string
          issueDate?: string | null
          issuer?: string
          name?: string
          order?: number
          profileId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Certification_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      Contract: {
        Row: {
          clientId: string
          createdAt: string
          deletedAt: string | null
          freelancerId: string
          id: string
          jobId: string
          status: Database["public"]["Enums"]["ContractStatus"]
          updatedAt: string
        }
        Insert: {
          clientId: string
          createdAt?: string
          deletedAt?: string | null
          freelancerId: string
          id: string
          jobId: string
          status?: Database["public"]["Enums"]["ContractStatus"]
          updatedAt: string
        }
        Update: {
          clientId?: string
          createdAt?: string
          deletedAt?: string | null
          freelancerId?: string
          id?: string
          jobId?: string
          status?: Database["public"]["Enums"]["ContractStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Contract_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Contract_freelancerId_fkey"
            columns: ["freelancerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Contract_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      Document: {
        Row: {
          fileName: string
          filePath: string
          fileSize: number | null
          id: string
          isApproved: boolean | null
          mimeType: string | null
          rejectionReason: string | null
          reviewedAt: string | null
          type: Database["public"]["Enums"]["DocumentType"]
          uploadedAt: string
          userId: string
        }
        Insert: {
          fileName: string
          filePath: string
          fileSize?: number | null
          id: string
          isApproved?: boolean | null
          mimeType?: string | null
          rejectionReason?: string | null
          reviewedAt?: string | null
          type: Database["public"]["Enums"]["DocumentType"]
          uploadedAt?: string
          userId: string
        }
        Update: {
          fileName?: string
          filePath?: string
          fileSize?: number | null
          id?: string
          isApproved?: boolean | null
          mimeType?: string | null
          rejectionReason?: string | null
          reviewedAt?: string | null
          type?: Database["public"]["Enums"]["DocumentType"]
          uploadedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Document_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      EducationItem: {
        Row: {
          createdAt: string
          degree: string
          description: string | null
          endDate: string | null
          fieldOfStudy: string | null
          id: string
          institution: string
          order: number
          profileId: string
          startDate: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          degree: string
          description?: string | null
          endDate?: string | null
          fieldOfStudy?: string | null
          id: string
          institution: string
          order?: number
          profileId: string
          startDate?: string | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          degree?: string
          description?: string | null
          endDate?: string | null
          fieldOfStudy?: string | null
          id?: string
          institution?: string
          order?: number
          profileId?: string
          startDate?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "EducationItem_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      EmailVerificationToken: {
        Row: {
          createdAt: string
          expiresAt: string
          id: string
          token: string
          usedAt: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          expiresAt: string
          id?: string
          token: string
          usedAt?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string
          id?: string
          token?: string
          usedAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "EmailVerificationToken_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ExperienceItem: {
        Row: {
          company: string
          createdAt: string
          current: boolean
          description: string | null
          endDate: string | null
          id: string
          location: string | null
          order: number
          position: string
          profileId: string
          startDate: string | null
          updatedAt: string
        }
        Insert: {
          company: string
          createdAt?: string
          current?: boolean
          description?: string | null
          endDate?: string | null
          id: string
          location?: string | null
          order?: number
          position: string
          profileId: string
          startDate?: string | null
          updatedAt: string
        }
        Update: {
          company?: string
          createdAt?: string
          current?: boolean
          description?: string | null
          endDate?: string | null
          id?: string
          location?: string | null
          order?: number
          position?: string
          profileId?: string
          startDate?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ExperienceItem_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      FraudFlag: {
        Row: {
          createdAt: string
          flagType: string | null
          id: string
          metadata: string | null
          reason: string
          reviewedAt: string | null
          reviewedBy: string | null
          riskScore: number
          severity: number | null
          status: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          flagType?: string | null
          id: string
          metadata?: string | null
          reason: string
          reviewedAt?: string | null
          reviewedBy?: string | null
          riskScore: number
          severity?: number | null
          status?: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          flagType?: string | null
          id?: string
          metadata?: string | null
          reason?: string
          reviewedAt?: string | null
          reviewedBy?: string | null
          riskScore?: number
          severity?: number | null
          status?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "FraudFlag_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      FreelancerScore: {
        Row: {
          availability: number | null
          budgetAlignment: number | null
          calculatedAt: string
          freelancerId: string
          id: string
          jobId: string
          pastSuccess: number | null
          rating: number | null
          responseTime: number | null
          skillsMatch: number | null
          totalScore: number
        }
        Insert: {
          availability?: number | null
          budgetAlignment?: number | null
          calculatedAt?: string
          freelancerId: string
          id?: string
          jobId: string
          pastSuccess?: number | null
          rating?: number | null
          responseTime?: number | null
          skillsMatch?: number | null
          totalScore: number
        }
        Update: {
          availability?: number | null
          budgetAlignment?: number | null
          calculatedAt?: string
          freelancerId?: string
          id?: string
          jobId?: string
          pastSuccess?: number | null
          rating?: number | null
          responseTime?: number | null
          skillsMatch?: number | null
          totalScore?: number
        }
        Relationships: [
          {
            foreignKeyName: "FreelancerScore_freelancerId_fkey"
            columns: ["freelancerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FreelancerScore_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      Invoice: {
        Row: {
          amount: number
          clientId: string
          contractId: string
          createdAt: string
          dueDate: string
          id: string
          paidAt: string | null
          releasedAt: string | null
          status: Database["public"]["Enums"]["InvoiceStatus"]
          updatedAt: string
        }
        Insert: {
          amount: number
          clientId: string
          contractId: string
          createdAt?: string
          dueDate: string
          id: string
          paidAt?: string | null
          releasedAt?: string | null
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          updatedAt: string
        }
        Update: {
          amount?: number
          clientId?: string
          contractId?: string
          createdAt?: string
          dueDate?: string
          id?: string
          paidAt?: string | null
          releasedAt?: string | null
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Invoice_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Invoice_contractId_fkey"
            columns: ["contractId"]
            isOneToOne: false
            referencedRelation: "Contract"
            referencedColumns: ["id"]
          },
        ]
      }
      Job: {
        Row: {
          approvedAt: string | null
          autoScreening: boolean | null
          availabilityRequirement: string | null
          budget: number
          category: string | null
          clientId: string
          companyLat: number | null
          companyLng: number | null
          companyLocation: string | null
          companyLogo: string | null
          companyName: string | null
          companyWebsite: string | null
          createdAt: string
          deadline: string
          deletedAt: string | null
          description: string
          englishLevel: string | null
          experienceLevel: string | null
          expiresAt: string | null
          hourlyRateMax: number | null
          hourlyRateMin: number | null
          id: string
          isApproved: boolean
          jobThumbnail: string | null
          jobType: string | null
          locationVisibility: string | null
          milestones: Json | null
          paymentType: string | null
          preferredLocations: Json | null
          priorityPlacement: string
          projectDuration: string | null
          projectFiles: Json | null
          projectGoal: string | null
          projectSize: string | null
          projectStage: string | null
          screeningQuestions: Json | null
          slug: string
          status: Database["public"]["Enums"]["JobStatus"]
          supportingImages: Json | null
          tags: string | null
          title: string
          updatedAt: string
        }
        Insert: {
          approvedAt?: string | null
          autoScreening?: boolean | null
          availabilityRequirement?: string | null
          budget: number
          category?: string | null
          clientId: string
          companyLat?: number | null
          companyLng?: number | null
          companyLocation?: string | null
          companyLogo?: string | null
          companyName?: string | null
          companyWebsite?: string | null
          createdAt?: string
          deadline: string
          deletedAt?: string | null
          description: string
          englishLevel?: string | null
          experienceLevel?: string | null
          expiresAt?: string | null
          hourlyRateMax?: number | null
          hourlyRateMin?: number | null
          id: string
          isApproved?: boolean
          jobThumbnail?: string | null
          jobType?: string | null
          locationVisibility?: string | null
          milestones?: Json | null
          paymentType?: string | null
          preferredLocations?: Json | null
          priorityPlacement?: string
          projectDuration?: string | null
          projectFiles?: Json | null
          projectGoal?: string | null
          projectSize?: string | null
          projectStage?: string | null
          screeningQuestions?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["JobStatus"]
          supportingImages?: Json | null
          tags?: string | null
          title: string
          updatedAt: string
        }
        Update: {
          approvedAt?: string | null
          autoScreening?: boolean | null
          availabilityRequirement?: string | null
          budget?: number
          category?: string | null
          clientId?: string
          companyLat?: number | null
          companyLng?: number | null
          companyLocation?: string | null
          companyLogo?: string | null
          companyName?: string | null
          companyWebsite?: string | null
          createdAt?: string
          deadline?: string
          deletedAt?: string | null
          description?: string
          englishLevel?: string | null
          experienceLevel?: string | null
          expiresAt?: string | null
          hourlyRateMax?: number | null
          hourlyRateMin?: number | null
          id?: string
          isApproved?: boolean
          jobThumbnail?: string | null
          jobType?: string | null
          locationVisibility?: string | null
          milestones?: Json | null
          paymentType?: string | null
          preferredLocations?: Json | null
          priorityPlacement?: string
          projectDuration?: string | null
          projectFiles?: Json | null
          projectGoal?: string | null
          projectSize?: string | null
          projectStage?: string | null
          screeningQuestions?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["JobStatus"]
          supportingImages?: Json | null
          tags?: string | null
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Job_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          content: string
          createdAt: string
          id: string
          isRead: boolean
          jobId: string | null
          proposalId: string | null
          receiverId: string
          senderId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          isRead?: boolean
          jobId?: string | null
          proposalId?: string | null
          receiverId: string
          senderId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          isRead?: boolean
          jobId?: string | null
          proposalId?: string | null
          receiverId?: string
          senderId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_proposalId_fkey"
            columns: ["proposalId"]
            isOneToOne: false
            referencedRelation: "Proposal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_receiverId_fkey"
            columns: ["receiverId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Milestone: {
        Row: {
          amount: number
          approvalNote: string | null
          approvedAt: string | null
          contractId: string
          createdAt: string
          deadline: string
          description: string
          fundedAt: string | null
          id: string
          status: Database["public"]["Enums"]["MilestoneStatus"]
          submissionFiles: Json | null
          submissionNote: string | null
          submittedAt: string | null
          title: string
          updatedAt: string
        }
        Insert: {
          amount: number
          approvalNote?: string | null
          approvedAt?: string | null
          contractId: string
          createdAt?: string
          deadline: string
          description: string
          fundedAt?: string | null
          id: string
          status?: Database["public"]["Enums"]["MilestoneStatus"]
          submissionFiles?: Json | null
          submissionNote?: string | null
          submittedAt?: string | null
          title: string
          updatedAt: string
        }
        Update: {
          amount?: number
          approvalNote?: string | null
          approvedAt?: string | null
          contractId?: string
          createdAt?: string
          deadline?: string
          description?: string
          fundedAt?: string | null
          id?: string
          status?: Database["public"]["Enums"]["MilestoneStatus"]
          submissionFiles?: Json | null
          submissionNote?: string | null
          submittedAt?: string | null
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Milestone_contractId_fkey"
            columns: ["contractId"]
            isOneToOne: false
            referencedRelation: "Contract"
            referencedColumns: ["id"]
          },
        ]
      }
      MilestoneComment: {
        Row: {
          comment: string
          createdAt: string
          id: string
          milestoneId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          comment: string
          createdAt?: string
          id?: string
          milestoneId: string
          updatedAt?: string
          userId: string
        }
        Update: {
          comment?: string
          createdAt?: string
          id?: string
          milestoneId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MilestoneComment_milestoneId_fkey"
            columns: ["milestoneId"]
            isOneToOne: false
            referencedRelation: "Milestone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MilestoneComment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Notification: {
        Row: {
          createdAt: string
          id: string
          link: string | null
          message: string
          read: boolean
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          link?: string | null
          message: string
          read?: boolean
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          type?: Database["public"]["Enums"]["NotificationType"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Payment: {
        Row: {
          amount: number
          createdAt: string
          id: string
          invoiceId: string
          status: Database["public"]["Enums"]["PaymentStatus"]
          updatedAt: string
        }
        Insert: {
          amount: number
          createdAt?: string
          id: string
          invoiceId: string
          status?: Database["public"]["Enums"]["PaymentStatus"]
          updatedAt: string
        }
        Update: {
          amount?: number
          createdAt?: string
          id?: string
          invoiceId?: string
          status?: Database["public"]["Enums"]["PaymentStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Payment_invoiceId_fkey"
            columns: ["invoiceId"]
            isOneToOne: false
            referencedRelation: "Invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      PayPalPayment: {
        Row: {
          amount: number
          billingAddressId: string | null
          createdAt: string
          currency: string
          id: string
          metadata: string | null
          paypalCaptureId: string | null
          paypalOrderId: string | null
          status: string
          tokensPurchased: number | null
          type: string
          updatedAt: string
          userId: string
        }
        Insert: {
          amount: number
          billingAddressId?: string | null
          createdAt?: string
          currency?: string
          id: string
          metadata?: string | null
          paypalCaptureId?: string | null
          paypalOrderId?: string | null
          status?: string
          tokensPurchased?: number | null
          type: string
          updatedAt: string
          userId: string
        }
        Update: {
          amount?: number
          billingAddressId?: string | null
          createdAt?: string
          currency?: string
          id?: string
          metadata?: string | null
          paypalCaptureId?: string | null
          paypalOrderId?: string | null
          status?: string
          tokensPurchased?: number | null
          type?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PayPalPayment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PayPalPayment_billingAddressId_fkey"
            columns: ["billingAddressId"]
            isOneToOne: false
            referencedRelation: "BillingAddress"
            referencedColumns: ["id"]
          },
        ]
      }
      PortfolioItem: {
        Row: {
          completedAt: string | null
          createdAt: string
          description: string | null
          featured: boolean
          id: string
          imageUrl: string | null
          order: number
          profileId: string
          technologies: string | null
          title: string
          updatedAt: string
          url: string | null
        }
        Insert: {
          completedAt?: string | null
          createdAt?: string
          description?: string | null
          featured?: boolean
          id: string
          imageUrl?: string | null
          order?: number
          profileId: string
          technologies?: string | null
          title: string
          updatedAt: string
          url?: string | null
        }
        Update: {
          completedAt?: string | null
          createdAt?: string
          description?: string | null
          featured?: boolean
          id?: string
          imageUrl?: string | null
          order?: number
          profileId?: string
          technologies?: string | null
          title?: string
          updatedAt?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "PortfolioItem_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      Profile: {
        Row: {
          bio: string | null
          brandLogo: string | null
          brandPrimaryColor: string | null
          brandSecondaryColor: string | null
          businessAddressLine1: string | null
          businessAddressLine2: string | null
          businessCity: string | null
          businessCountry: string | null
          businessEmail: string | null
          businessPhone: string | null
          businessPostalCode: string | null
          businessRegistrationNumber: string | null
          businessState: string | null
          companyInfo: string | null
          companyName: string | null
          country: string | null
          createdAt: string
          education: string | null
          experience: string | null
          firstName: string | null
          id: string
          industry: string | null
          isPublished: boolean | null
          lastName: string | null
          location: string | null
          phone: string | null
          portfolio: string | null
          profilePicture: string | null
          rate: number | null
          skills: string | null
          slug: string
          taxId: string | null
          timezone: string | null
          title: string | null
          updatedAt: string
          userId: string
          verified: boolean
          website: string | null
        }
        Insert: {
          bio?: string | null
          brandLogo?: string | null
          brandPrimaryColor?: string | null
          brandSecondaryColor?: string | null
          businessAddressLine1?: string | null
          businessAddressLine2?: string | null
          businessCity?: string | null
          businessCountry?: string | null
          businessEmail?: string | null
          businessPhone?: string | null
          businessPostalCode?: string | null
          businessRegistrationNumber?: string | null
          businessState?: string | null
          companyInfo?: string | null
          companyName?: string | null
          country?: string | null
          createdAt?: string
          education?: string | null
          experience?: string | null
          firstName?: string | null
          id: string
          industry?: string | null
          isPublished?: boolean | null
          lastName?: string | null
          location?: string | null
          phone?: string | null
          portfolio?: string | null
          profilePicture?: string | null
          rate?: number | null
          skills?: string | null
          slug: string
          taxId?: string | null
          timezone?: string | null
          title?: string | null
          updatedAt: string
          userId: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          bio?: string | null
          brandLogo?: string | null
          brandPrimaryColor?: string | null
          brandSecondaryColor?: string | null
          businessAddressLine1?: string | null
          businessAddressLine2?: string | null
          businessCity?: string | null
          businessCountry?: string | null
          businessEmail?: string | null
          businessPhone?: string | null
          businessPostalCode?: string | null
          businessRegistrationNumber?: string | null
          businessState?: string | null
          companyInfo?: string | null
          companyName?: string | null
          country?: string | null
          createdAt?: string
          education?: string | null
          experience?: string | null
          firstName?: string | null
          id?: string
          industry?: string | null
          isPublished?: boolean | null
          lastName?: string | null
          location?: string | null
          phone?: string | null
          portfolio?: string | null
          profilePicture?: string | null
          rate?: number | null
          skills?: string | null
          slug?: string
          taxId?: string | null
          timezone?: string | null
          title?: string | null
          updatedAt?: string
          userId?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Profile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ProfileView: {
        Row: {
          id: string
          profileId: string
          viewedAt: string
          viewerId: string | null
          viewerIp: string | null
        }
        Insert: {
          id: string
          profileId: string
          viewedAt?: string
          viewerId?: string | null
          viewerIp?: string | null
        }
        Update: {
          id?: string
          profileId?: string
          viewedAt?: string
          viewerId?: string | null
          viewerIp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ProfileView_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ProjectActivity: {
        Row: {
          action: string
          clientId: string
          createdAt: string
          createdBy: string
          description: string
          fileId: string | null
          id: string
          metadata: Json | null
          milestoneId: string | null
          projectMilestoneId: string | null
        }
        Insert: {
          action: string
          clientId: string
          createdAt?: string
          createdBy: string
          description: string
          fileId?: string | null
          id?: string
          metadata?: Json | null
          milestoneId?: string | null
          projectMilestoneId?: string | null
        }
        Update: {
          action?: string
          clientId?: string
          createdAt?: string
          createdBy?: string
          description?: string
          fileId?: string | null
          id?: string
          metadata?: Json | null
          milestoneId?: string | null
          projectMilestoneId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ProjectActivity_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectActivity_createdBy_fkey"
            columns: ["createdBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectActivity_fileId_fkey"
            columns: ["fileId"]
            isOneToOne: false
            referencedRelation: "ProjectFile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectActivity_milestoneId_fkey"
            columns: ["milestoneId"]
            isOneToOne: false
            referencedRelation: "Milestone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectActivity_projectMilestoneId_fkey"
            columns: ["projectMilestoneId"]
            isOneToOne: false
            referencedRelation: "ProjectMilestone"
            referencedColumns: ["id"]
          },
        ]
      }
      ProjectFile: {
        Row: {
          category: string | null
          clientId: string
          contractId: string | null
          createdAt: string
          description: string | null
          filePath: string
          id: string
          isPublic: boolean | null
          milestoneId: string | null
          mimeType: string
          name: string
          originalName: string
          projectMilestoneId: string | null
          size: number
          tags: string[] | null
          updatedAt: string
          uploadedBy: string
        }
        Insert: {
          category?: string | null
          clientId: string
          contractId?: string | null
          createdAt?: string
          description?: string | null
          filePath: string
          id?: string
          isPublic?: boolean | null
          milestoneId?: string | null
          mimeType: string
          name: string
          originalName: string
          projectMilestoneId?: string | null
          size: number
          tags?: string[] | null
          updatedAt?: string
          uploadedBy: string
        }
        Update: {
          category?: string | null
          clientId?: string
          contractId?: string | null
          createdAt?: string
          description?: string | null
          filePath?: string
          id?: string
          isPublic?: boolean | null
          milestoneId?: string | null
          mimeType?: string
          name?: string
          originalName?: string
          projectMilestoneId?: string | null
          size?: number
          tags?: string[] | null
          updatedAt?: string
          uploadedBy?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProjectFile_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectFile_contractId_fkey"
            columns: ["contractId"]
            isOneToOne: false
            referencedRelation: "Contract"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectFile_milestoneId_fkey"
            columns: ["milestoneId"]
            isOneToOne: false
            referencedRelation: "Milestone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectFile_projectMilestoneId_fkey"
            columns: ["projectMilestoneId"]
            isOneToOne: false
            referencedRelation: "ProjectMilestone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectFile_uploadedBy_fkey"
            columns: ["uploadedBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ProjectMilestone: {
        Row: {
          assignedTo: string | null
          clientId: string
          completedAt: string | null
          contractId: string | null
          createdAt: string
          description: string | null
          dueDate: string
          id: string
          priority: string
          progress: number | null
          status: string
          tags: string[] | null
          title: string
          updatedAt: string
        }
        Insert: {
          assignedTo?: string | null
          clientId: string
          completedAt?: string | null
          contractId?: string | null
          createdAt?: string
          description?: string | null
          dueDate: string
          id?: string
          priority?: string
          progress?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updatedAt?: string
        }
        Update: {
          assignedTo?: string | null
          clientId?: string
          completedAt?: string | null
          contractId?: string | null
          createdAt?: string
          description?: string | null
          dueDate?: string
          id?: string
          priority?: string
          progress?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProjectMilestone_assignedTo_fkey"
            columns: ["assignedTo"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectMilestone_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectMilestone_contractId_fkey"
            columns: ["contractId"]
            isOneToOne: false
            referencedRelation: "Contract"
            referencedColumns: ["id"]
          },
        ]
      }
      ProjectMilestoneComment: {
        Row: {
          comment: string
          createdAt: string
          id: string
          projectMilestoneId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          comment: string
          createdAt?: string
          id?: string
          projectMilestoneId: string
          updatedAt?: string
          userId: string
        }
        Update: {
          comment?: string
          createdAt?: string
          id?: string
          projectMilestoneId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProjectMilestoneComment_projectMilestoneId_fkey"
            columns: ["projectMilestoneId"]
            isOneToOne: false
            referencedRelation: "ProjectMilestone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProjectMilestoneComment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Proposal: {
        Row: {
          aiAnalysis: string | null
          aiScore: number | null
          coverLetter: string
          createdAt: string
          deletedAt: string | null
          freelancerId: string
          id: string
          jobId: string
          proposedRate: number
          screeningAnswers: Json | null
          status: Database["public"]["Enums"]["ProposalStatus"]
          tokenBid: number
          updatedAt: string
        }
        Insert: {
          aiAnalysis?: string | null
          aiScore?: number | null
          coverLetter: string
          createdAt?: string
          deletedAt?: string | null
          freelancerId: string
          id: string
          jobId: string
          proposedRate: number
          screeningAnswers?: Json | null
          status?: Database["public"]["Enums"]["ProposalStatus"]
          tokenBid?: number
          updatedAt: string
        }
        Update: {
          aiAnalysis?: string | null
          aiScore?: number | null
          coverLetter?: string
          createdAt?: string
          deletedAt?: string | null
          freelancerId?: string
          id?: string
          jobId?: string
          proposedRate?: number
          screeningAnswers?: Json | null
          status?: Database["public"]["Enums"]["ProposalStatus"]
          tokenBid?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Proposal_freelancerId_fkey"
            columns: ["freelancerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Proposal_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      ProposalTracking: {
        Row: {
          clientId: string
          contactedAt: string | null
          createdAt: string
          freelancerId: string
          id: string
          interviewCompletedAt: string | null
          interviewScheduledFor: string | null
          jobId: string
          notes: string | null
          offerSentAt: string | null
          proposalId: string
          rating: number | null
          responseDeadline: string | null
          status: string
          tags: string[] | null
          updatedAt: string
        }
        Insert: {
          clientId: string
          contactedAt?: string | null
          createdAt?: string
          freelancerId: string
          id?: string
          interviewCompletedAt?: string | null
          interviewScheduledFor?: string | null
          jobId: string
          notes?: string | null
          offerSentAt?: string | null
          proposalId: string
          rating?: number | null
          responseDeadline?: string | null
          status?: string
          tags?: string[] | null
          updatedAt?: string
        }
        Update: {
          clientId?: string
          contactedAt?: string | null
          createdAt?: string
          freelancerId?: string
          id?: string
          interviewCompletedAt?: string | null
          interviewScheduledFor?: string | null
          jobId?: string
          notes?: string | null
          offerSentAt?: string | null
          proposalId?: string
          rating?: number | null
          responseDeadline?: string | null
          status?: string
          tags?: string[] | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProposalTracking_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProposalTracking_freelancerId_fkey"
            columns: ["freelancerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProposalTracking_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProposalTracking_proposalId_fkey"
            columns: ["proposalId"]
            isOneToOne: true
            referencedRelation: "Proposal"
            referencedColumns: ["id"]
          },
        ]
      }
      ProposalTrackingActivity: {
        Row: {
          action: string
          createdAt: string
          createdBy: string
          description: string
          id: string
          metadata: Json | null
          trackingId: string
        }
        Insert: {
          action: string
          createdAt?: string
          createdBy: string
          description: string
          id?: string
          metadata?: Json | null
          trackingId: string
        }
        Update: {
          action?: string
          createdAt?: string
          createdBy?: string
          description?: string
          id?: string
          metadata?: Json | null
          trackingId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProposalTrackingActivity_createdBy_fkey"
            columns: ["createdBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProposalTrackingActivity_trackingId_fkey"
            columns: ["trackingId"]
            isOneToOne: false
            referencedRelation: "ProposalTracking"
            referencedColumns: ["id"]
          },
        ]
      }
      SsoConfiguration: {
        Row: {
          config: Json
          createdAt: string
          id: string
          isActive: boolean
          organizationId: string
          provider: string
          updatedAt: string
        }
        Insert: {
          config: Json
          createdAt?: string
          id?: string
          isActive?: boolean
          organizationId: string
          provider: string
          updatedAt?: string
        }
        Update: {
          config?: Json
          createdAt?: string
          id?: string
          isActive?: boolean
          organizationId?: string
          provider?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SsoConfiguration_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: true
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StripePayment: {
        Row: {
          amount: number
          createdAt: string
          currency: string
          id: string
          metadata: string | null
          status: Database["public"]["Enums"]["StripePaymentStatus"]
          stripePaymentIntentId: string | null
          stripeSessionId: string | null
          tokensPurchased: number | null
          type: Database["public"]["Enums"]["StripePaymentType"]
          updatedAt: string
          userId: string
        }
        Insert: {
          amount: number
          createdAt?: string
          currency?: string
          id: string
          metadata?: string | null
          status?: Database["public"]["Enums"]["StripePaymentStatus"]
          stripePaymentIntentId?: string | null
          stripeSessionId?: string | null
          tokensPurchased?: number | null
          type: Database["public"]["Enums"]["StripePaymentType"]
          updatedAt: string
          userId: string
        }
        Update: {
          amount?: number
          createdAt?: string
          currency?: string
          id?: string
          metadata?: string | null
          status?: Database["public"]["Enums"]["StripePaymentStatus"]
          stripePaymentIntentId?: string | null
          stripeSessionId?: string | null
          tokensPurchased?: number | null
          type?: Database["public"]["Enums"]["StripePaymentType"]
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StripePayment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Subscription: {
        Row: {
          cancelAtPeriodEnd: boolean
          createdAt: string
          currentPeriodEnd: string
          currentPeriodStart: string
          gracePeriodEnd: string | null
          id: string
          paypalOrderId: string | null
          paypalPaymentId: string | null
          paypalPlanId: string | null
          paypalSubscriptionId: string | null
          plan: string
          reminderSentAt: string | null
          status: string
          stripePriceId: string | null
          stripeProductId: string | null
          stripeSubscriptionId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          cancelAtPeriodEnd?: boolean
          createdAt?: string
          currentPeriodEnd: string
          currentPeriodStart: string
          gracePeriodEnd?: string | null
          id: string
          paypalOrderId?: string | null
          paypalPaymentId?: string | null
          paypalPlanId?: string | null
          paypalSubscriptionId?: string | null
          plan: string
          reminderSentAt?: string | null
          status: string
          stripePriceId?: string | null
          stripeProductId?: string | null
          stripeSubscriptionId?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          cancelAtPeriodEnd?: boolean
          createdAt?: string
          currentPeriodEnd?: string
          currentPeriodStart?: string
          gracePeriodEnd?: string | null
          id?: string
          paypalOrderId?: string | null
          paypalPaymentId?: string | null
          paypalPlanId?: string | null
          paypalSubscriptionId?: string | null
          plan?: string
          reminderSentAt?: string | null
          status?: string
          stripePriceId?: string | null
          stripeProductId?: string | null
          stripeSubscriptionId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Subscription_userId_fkey"
            columns: ["userId"]
            isOneToOne: true
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SubscriptionPlanConfig: {
        Row: {
          createdAt: string
          currency: string
          description: string | null
          featured: boolean
          features: string | null
          id: string
          interval: string
          isActive: boolean
          maxJobPosts: number | null
          name: string
          paypalPlanId: string | null
          paypalProductId: string | null
          plan: string
          priceAmount: number
          priority: boolean
          stripePriceId: string | null
          stripeProductId: string | null
          tokensPerWeek: number | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          currency?: string
          description?: string | null
          featured?: boolean
          features?: string | null
          id: string
          interval: string
          isActive?: boolean
          maxJobPosts?: number | null
          name: string
          paypalPlanId?: string | null
          paypalProductId?: string | null
          plan: string
          priceAmount: number
          priority?: boolean
          stripePriceId?: string | null
          stripeProductId?: string | null
          tokensPerWeek?: number | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          currency?: string
          description?: string | null
          featured?: boolean
          features?: string | null
          id?: string
          interval?: string
          isActive?: boolean
          maxJobPosts?: number | null
          name?: string
          paypalPlanId?: string | null
          paypalProductId?: string | null
          plan?: string
          priceAmount?: number
          priority?: boolean
          stripePriceId?: string | null
          stripeProductId?: string | null
          tokensPerWeek?: number | null
          updatedAt?: string
        }
        Relationships: []
      }
      SupportTicket: {
        Row: {
          category: string
          createdAt: string
          firstResponseAt: string | null
          id: string
          message: string
          priority: string
          status: string
          subject: string
          ticketNumber: string
          updatedAt: string
          userId: string
        }
        Insert: {
          category: string
          createdAt?: string
          firstResponseAt?: string | null
          id: string
          message: string
          priority: string
          status?: string
          subject: string
          ticketNumber?: string
          updatedAt: string
          userId: string
        }
        Update: {
          category?: string
          createdAt?: string
          firstResponseAt?: string | null
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          ticketNumber?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SupportTicket_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SupportTicketMessage: {
        Row: {
          attachmentUrl: string | null
          createdAt: string
          id: string
          isStaffResponse: boolean
          message: string
          senderId: string
          ticketId: string
        }
        Insert: {
          attachmentUrl?: string | null
          createdAt?: string
          id?: string
          isStaffResponse?: boolean
          message: string
          senderId: string
          ticketId: string
        }
        Update: {
          attachmentUrl?: string | null
          createdAt?: string
          id?: string
          isStaffResponse?: boolean
          message?: string
          senderId?: string
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SupportTicketMessage_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SupportTicketMessage_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "SupportTicket"
            referencedColumns: ["id"]
          },
        ]
      }
      TeamMember: {
        Row: {
          acceptedAt: string | null
          createdAt: string
          email: string
          id: string
          invitationExpiresAt: string | null
          invitationToken: string | null
          invitedBy: string
          isActive: boolean
          name: string | null
          organizationId: string
          role: string
          updatedAt: string
          userId: string | null
        }
        Insert: {
          acceptedAt?: string | null
          createdAt?: string
          email: string
          id?: string
          invitationExpiresAt?: string | null
          invitationToken?: string | null
          invitedBy: string
          isActive?: boolean
          name?: string | null
          organizationId: string
          role?: string
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          acceptedAt?: string | null
          createdAt?: string
          email?: string
          id?: string
          invitationExpiresAt?: string | null
          invitationToken?: string | null
          invitedBy?: string
          isActive?: boolean
          name?: string | null
          organizationId?: string
          role?: string
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TeamMember_invitedBy_fkey"
            columns: ["invitedBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TeamMember_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TeamMember_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TeamRole: {
        Row: {
          createdAt: string
          id: string
          isDefault: boolean
          name: string
          organizationId: string
          permissions: Json
        }
        Insert: {
          createdAt?: string
          id?: string
          isDefault?: boolean
          name: string
          organizationId: string
          permissions: Json
        }
        Update: {
          createdAt?: string
          id?: string
          isDefault?: boolean
          name?: string
          organizationId?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "TeamRole_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TicketResponse: {
        Row: {
          createdAt: string
          id: string
          isInternal: boolean
          message: string
          responderId: string | null
          ticketId: string
        }
        Insert: {
          createdAt?: string
          id: string
          isInternal?: boolean
          message: string
          responderId?: string | null
          ticketId: string
        }
        Update: {
          createdAt?: string
          id?: string
          isInternal?: boolean
          message?: string
          responderId?: string | null
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketResponse_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "SupportTicket"
            referencedColumns: ["id"]
          },
        ]
      }
      TokenLog: {
        Row: {
          action: string
          amount: number
          createdAt: string
          id: string
          userId: string
        }
        Insert: {
          action: string
          amount: number
          createdAt?: string
          id: string
          userId: string
        }
        Update: {
          action?: string
          amount?: number
          createdAt?: string
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TokenLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TokenPurchasePlan: {
        Row: {
          createdAt: string
          currency: string
          id: string
          isActive: boolean
          name: string
          priceAmount: number
          stripePriceId: string | null
          tokens: number
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          currency?: string
          id: string
          isActive?: boolean
          name: string
          priceAmount: number
          stripePriceId?: string | null
          tokens: number
          updatedAt: string
        }
        Update: {
          createdAt?: string
          currency?: string
          id?: string
          isActive?: boolean
          name?: string
          priceAmount?: number
          stripePriceId?: string | null
          tokens?: number
          updatedAt?: string
        }
        Relationships: []
      }
      User: {
        Row: {
          accountManagerId: string | null
          autoLoginToken: string | null
          autoLoginTokenExpiry: string | null
          clientType: string | null
          createdAt: string
          deletedAt: string | null
          email: string
          fraudFlags: Json | null
          id: string
          isSoftSuspended: boolean | null
          isVerified: boolean
          jobPostsResetAt: string | null
          jobPostsUsed: number
          lastFlaggedAt: string | null
          lastLoginAt: string | null
          lastLoginIp: string | null
          linkedAccountIds: string[] | null
          notificationPreferences: Json | null
          organizationId: string | null
          paypalCustomerId: string | null
          profileCompleted: boolean
          role: Database["public"]["Enums"]["Role"]
          signupIp: string | null
          subscriptionPlan: string
          tokenResetAt: string | null
          tokens: number
          trustScore: number | null
          twoFactorBackupCodes: string[] | null
          twoFactorEnabled: boolean | null
          twoFactorSecret: string | null
          updatedAt: string
          verificationDeadline: string | null
          verificationPaidAt: string | null
          verificationPaymentAmount: number | null
          verificationPaymentIntentId: string | null
          verificationPaymentMethodId: string | null
          verificationPaymentStatus: string | null
          verificationStartedAt: string | null
          verificationSubmittedAt: string | null
          verificationToken: string | null
          verificationTokenExpiry: string | null
        }
        Insert: {
          accountManagerId?: string | null
          autoLoginToken?: string | null
          autoLoginTokenExpiry?: string | null
          clientType?: string | null
          createdAt?: string
          deletedAt?: string | null
          email: string
          fraudFlags?: Json | null
          id: string
          isSoftSuspended?: boolean | null
          isVerified?: boolean
          jobPostsResetAt?: string | null
          jobPostsUsed?: number
          lastFlaggedAt?: string | null
          lastLoginAt?: string | null
          lastLoginIp?: string | null
          linkedAccountIds?: string[] | null
          notificationPreferences?: Json | null
          organizationId?: string | null
          paypalCustomerId?: string | null
          profileCompleted?: boolean
          role: Database["public"]["Enums"]["Role"]
          signupIp?: string | null
          subscriptionPlan?: string
          tokenResetAt?: string | null
          tokens?: number
          trustScore?: number | null
          twoFactorBackupCodes?: string[] | null
          twoFactorEnabled?: boolean | null
          twoFactorSecret?: string | null
          updatedAt: string
          verificationDeadline?: string | null
          verificationPaidAt?: string | null
          verificationPaymentAmount?: number | null
          verificationPaymentIntentId?: string | null
          verificationPaymentMethodId?: string | null
          verificationPaymentStatus?: string | null
          verificationStartedAt?: string | null
          verificationSubmittedAt?: string | null
          verificationToken?: string | null
          verificationTokenExpiry?: string | null
        }
        Update: {
          accountManagerId?: string | null
          autoLoginToken?: string | null
          autoLoginTokenExpiry?: string | null
          clientType?: string | null
          createdAt?: string
          deletedAt?: string | null
          email?: string
          fraudFlags?: Json | null
          id?: string
          isSoftSuspended?: boolean | null
          isVerified?: boolean
          jobPostsResetAt?: string | null
          jobPostsUsed?: number
          lastFlaggedAt?: string | null
          lastLoginAt?: string | null
          lastLoginIp?: string | null
          linkedAccountIds?: string[] | null
          notificationPreferences?: Json | null
          organizationId?: string | null
          paypalCustomerId?: string | null
          profileCompleted?: boolean
          role?: Database["public"]["Enums"]["Role"]
          signupIp?: string | null
          subscriptionPlan?: string
          tokenResetAt?: string | null
          tokens?: number
          trustScore?: number | null
          twoFactorBackupCodes?: string[] | null
          twoFactorEnabled?: boolean | null
          twoFactorSecret?: string | null
          updatedAt?: string
          verificationDeadline?: string | null
          verificationPaidAt?: string | null
          verificationPaymentAmount?: number | null
          verificationPaymentIntentId?: string | null
          verificationPaymentMethodId?: string | null
          verificationPaymentStatus?: string | null
          verificationStartedAt?: string | null
          verificationSubmittedAt?: string | null
          verificationToken?: string | null
          verificationTokenExpiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "User_accountManagerId_fkey"
            columns: ["accountManagerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "User_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Verification: {
        Row: {
          adminNotes: string | null
          createdAt: string
          details: string | null
          documentType: string | null
          expiryDate: string | null
          files: string | null
          id: string
          idType: string | null
          rejectionReason: string | null
          reviewedAt: string | null
          reviewedBy: string | null
          status: Database["public"]["Enums"]["VerificationStatus"]
          updatedAt: string
          userId: string
          verificationType: string | null
        }
        Insert: {
          adminNotes?: string | null
          createdAt?: string
          details?: string | null
          documentType?: string | null
          expiryDate?: string | null
          files?: string | null
          id: string
          idType?: string | null
          rejectionReason?: string | null
          reviewedAt?: string | null
          reviewedBy?: string | null
          status?: Database["public"]["Enums"]["VerificationStatus"]
          updatedAt: string
          userId: string
          verificationType?: string | null
        }
        Update: {
          adminNotes?: string | null
          createdAt?: string
          details?: string | null
          documentType?: string | null
          expiryDate?: string | null
          files?: string | null
          id?: string
          idType?: string | null
          rejectionReason?: string | null
          reviewedAt?: string | null
          reviewedBy?: string | null
          status?: Database["public"]["Enums"]["VerificationStatus"]
          updatedAt?: string
          userId?: string
          verificationType?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Verification_reviewedBy_fkey"
            columns: ["reviewedBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Verification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      VideoInterview: {
        Row: {
          clientId: string
          createdAt: string
          duration: number
          freelancerId: string
          id: string
          jobId: string
          notes: string | null
          platform: string | null
          proposalId: string | null
          recordingUrl: string | null
          roomUrl: string
          scheduledAt: string
          status: string
          transcriptUrl: string | null
        }
        Insert: {
          clientId: string
          createdAt?: string
          duration?: number
          freelancerId: string
          id?: string
          jobId: string
          notes?: string | null
          platform?: string | null
          proposalId?: string | null
          recordingUrl?: string | null
          roomUrl: string
          scheduledAt: string
          status?: string
          transcriptUrl?: string | null
        }
        Update: {
          clientId?: string
          createdAt?: string
          duration?: number
          freelancerId?: string
          id?: string
          jobId?: string
          notes?: string | null
          platform?: string | null
          proposalId?: string | null
          recordingUrl?: string | null
          roomUrl?: string
          scheduledAt?: string
          status?: string
          transcriptUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "VideoInterview_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VideoInterview_freelancerId_fkey"
            columns: ["freelancerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VideoInterview_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VideoInterview_proposalId_fkey"
            columns: ["proposalId"]
            isOneToOne: false
            referencedRelation: "Proposal"
            referencedColumns: ["id"]
          },
        ]
      }
      WebhookDelivery: {
        Row: {
          attemptCount: number
          createdAt: string
          deliveredAt: string | null
          endpointId: string
          event: string
          httpStatus: number | null
          id: string
          nextRetryAt: string | null
          payload: Json
          responseBody: string | null
        }
        Insert: {
          attemptCount?: number
          createdAt?: string
          deliveredAt?: string | null
          endpointId: string
          event: string
          httpStatus?: number | null
          id?: string
          nextRetryAt?: string | null
          payload: Json
          responseBody?: string | null
        }
        Update: {
          attemptCount?: number
          createdAt?: string
          deliveredAt?: string | null
          endpointId?: string
          event?: string
          httpStatus?: number | null
          id?: string
          nextRetryAt?: string | null
          payload?: Json
          responseBody?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "WebhookDelivery_endpointId_fkey"
            columns: ["endpointId"]
            isOneToOne: false
            referencedRelation: "WebhookEndpoint"
            referencedColumns: ["id"]
          },
        ]
      }
      WebhookEndpoint: {
        Row: {
          createdAt: string
          description: string | null
          events: string[]
          id: string
          isActive: boolean
          lastUsedAt: string | null
          secret: string
          updatedAt: string
          url: string
          userId: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          events?: string[]
          id?: string
          isActive?: boolean
          lastUsedAt?: string | null
          secret: string
          updatedAt?: string
          url: string
          userId: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          events?: string[]
          id?: string
          isActive?: boolean
          lastUsedAt?: string | null
          secret?: string
          updatedAt?: string
          url?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "WebhookEndpoint_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_job_owner: { Args: { job_id: string }; Returns: string }
      get_job_priority_weight: { Args: { placement: string }; Returns: number }
      get_verification_progress:
        | {
            Args: { user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_verification_progress(user_id => text), public.get_verification_progress(user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_verification_progress(user_id => text), public.get_verification_progress(user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      is_admin: { Args: never; Returns: boolean }
      is_verification_overdue:
        | {
            Args: { user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_verification_overdue(user_id => text), public.is_verification_overdue(user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_verification_overdue(user_id => text), public.is_verification_overdue(user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      user_has_proposal_for_job: {
        Args: { job_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ContractStatus: "ACTIVE" | "COMPLETED" | "TERMINATED"
      DocumentType:
        | "ID_VERIFICATION"
        | "BUSINESS_REGISTRATION"
        | "COMPANY_DOCUMENTS"
        | "PORTFOLIO_ITEM"
      InvoiceStatus: "DRAFT" | "SENT" | "PAID" | "OVERDUE"
      JobStatus: "OPEN" | "PAUSED" | "CLOSED"
      MilestoneStatus:
        | "PENDING"
        | "FUNDED"
        | "SUBMITTED"
        | "APPROVED"
        | "CANCELED"
      NotificationType:
        | "PROPOSAL_RECEIVED"
        | "CONTRACT_STARTED"
        | "MILESTONE_FUNDED"
        | "MILESTONE_COMPLETED"
        | "PAYMENT_RECEIVED"
        | "MESSAGE_RECEIVED"
        | "MILESTONE_SUBMITTED"
        | "INTERVIEW_SCHEDULED"
        | "VERIFICATION_APPROVED"
        | "VERIFICATION_REJECTED"
      PaymentStatus: "PENDING" | "PAID" | "FAILED"
      ProposalStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"
      Role: "FREELANCER" | "CLIENT" | "ADMIN"
      StripePaymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
      StripePaymentType:
        | "CLIENT_VERIFICATION"
        | "JOB_RENEWAL"
        | "TOKEN_PURCHASE"
      VerificationStatus: "PENDING" | "APPROVED" | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ContractStatus: ["ACTIVE", "COMPLETED", "TERMINATED"],
      DocumentType: [
        "ID_VERIFICATION",
        "BUSINESS_REGISTRATION",
        "COMPANY_DOCUMENTS",
        "PORTFOLIO_ITEM",
      ],
      InvoiceStatus: ["DRAFT", "SENT", "PAID", "OVERDUE"],
      JobStatus: ["OPEN", "PAUSED", "CLOSED"],
      MilestoneStatus: [
        "PENDING",
        "FUNDED",
        "SUBMITTED",
        "APPROVED",
        "CANCELED",
      ],
      NotificationType: [
        "PROPOSAL_RECEIVED",
        "CONTRACT_STARTED",
        "MILESTONE_FUNDED",
        "MILESTONE_COMPLETED",
        "PAYMENT_RECEIVED",
        "MESSAGE_RECEIVED",
        "MILESTONE_SUBMITTED",
        "INTERVIEW_SCHEDULED",
        "VERIFICATION_APPROVED",
        "VERIFICATION_REJECTED",
      ],
      PaymentStatus: ["PENDING", "PAID", "FAILED"],
      ProposalStatus: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"],
      Role: ["FREELANCER", "CLIENT", "ADMIN"],
      StripePaymentStatus: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      StripePaymentType: [
        "CLIENT_VERIFICATION",
        "JOB_RENEWAL",
        "TOKEN_PURCHASE",
      ],
      VerificationStatus: ["PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const

// Subscription Plan Enum
export enum SubscriptionPlan {
  FREELANCER_FREE = 'FREELANCER_FREE',
  FREELANCER_PRO = 'FREELANCER_PRO',
  FREELANCER_ELITE = 'FREELANCER_ELITE',
  CLIENT_STARTER = 'CLIENT_STARTER',
  CLIENT_BUSINESS = 'CLIENT_BUSINESS',
  CLIENT_ENTERPRISE = 'CLIENT_ENTERPRISE',
}

// Convenience type exports
export type Profile = Database['public']['Tables']['Profile']['Row'];
export type User = Database['public']['Tables']['User']['Row'];
export type Role = Database['public']['Enums']['Role'];
export type Invoice = Database['public']['Tables']['Invoice']['Row'];
export type Contract = Database['public']['Tables']['Contract']['Row'];
export type Job = Database['public']['Tables']['Job']['Row'];
export type Certification = Database['public']['Tables']['Certification']['Row'];
export type EducationItem = Database['public']['Tables']['EducationItem']['Row'];
export type ExperienceItem = Database['public']['Tables']['ExperienceItem']['Row'];
export type PortfolioItem = Database['public']['Tables']['PortfolioItem']['Row'];
export type Proposal = Database['public']['Tables']['Proposal']['Row'];
export type NotificationType = Database['public']['Enums']['NotificationType'];
export type Notification = Database['public']['Tables']['Notification']['Row'];
