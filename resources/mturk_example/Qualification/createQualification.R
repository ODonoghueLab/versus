library(MTurkR)

SANDBOX = TRUE

options('MTurkR.sandbox' = SANDBOX)
credentials(keypair=c("AKIAIMO4QNO42XBUTF5A", "B/1xtRO6rqDV0ABkL7oUr7QZoLhYmqWNatRDEf2D"))

# Load the XML files
QuestionForm <- paste0(readLines('qualification.question.html'), collapse='')
AnswerKey <- paste0(readLines('qualification.answer.xml'), collapse='')

# Created the QualificationType
newqual <- CreateQualificationType(name="Participation Consent and Qualification for Estimating Point Distances",
                                   description="Participation Information and Qualification for Estimating Point Distances",
                                   status="Active", test.duration=seconds(hours=1),
                                   test=QuestionForm, answerkey = AnswerKey,
                                   retry.delay = seconds(minutes = 1))

createQualification <- function(test=F) {
  
  qualID = ifelse(SANDBOX, "3VVYNZTOMVA3N8US21LJISPN29MDAE", "3D05Y5UXI0MVCPL1PALKFG2ICD081X")
  
  # Qualification requirements
  if (test) {
    qual <- GenerateQualificationRequirement(c(qualID),
                                             c("=="),
                                             c("100"));
    return(qual)
  }
  qual <- GenerateQualificationRequirement(c("Approved", "NumberApproved", qualID),
                                           c(">=", ">=", "=="),
                                           c("98", "5000", "1"),
                                           c(qualID, "==", "100"));
}