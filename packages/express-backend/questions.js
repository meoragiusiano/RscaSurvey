export const defaultQuestions = [
    // Demographic Information
    {
      section: "demographic",
      text: "What is your age?",
      type: "number",
      required: true
    },
    {
      section: "demographic",
      text: "What is your race/ethnicity? Check all that apply.",
      type: "multiple-select",
      options: [
        "Hispanic or Latino",
        "Not Hispanic or Latino",
        "American Indian or Alaska Native",
        "Asian",
        "Black or African American",
        "Native Hawaiian or Other Pacific Islander",
        "White",
        "East Asian",
        "South Asian",
        "Southeast Asian", 
        "Other Asian",
        "Filipina/o/x",
        "Indigenous / Aboriginal Identity",
        "Mexican American or Chicano/a/x",
        "Puerto Rican",
        "Central American",
        "Other Latino/a/x",
        "Race/ethnicity unknown"
      ],
      definitions: new Map([
        ["Hispanic or Latino", "A person of Cuban, Mexican, Puerto Rican, South or Central American, or other Spanish culture or origin, regardless of race."],
        ["American Indian or Alaska Native", "A person having origins in any of the original peoples of North and South America (including Central America) who maintains cultural identification through tribal affiliation or community attachment."],
        ["Asian", "A person having origins in any of the original peoples of the Far East, Southeast Asia, or the Indian Subcontinent."],
        ["Black or African American", "A person having origins in any of the black racial groups of Africa."],
        ["Native Hawaiian or Other Pacific Islander", "A person having origins in any of the original peoples of Hawaii, Guam, Samoa, or other Pacific Islands."],
        ["White", "A person having origins in any of the original peoples of Europe, the Middle East, or North Africa."]
      ]),
      required: true
    },
    {
        section: "demographic",
        text: "What is your gender?",
        type: "multiple-choice",
        options: [
          "Man",
          "Woman",
          "Non-binary",
          "Genderqueer or gender non-conforming",
          "Another identity not listed",
          "I'd rather not say"
        ],
      },
      {
        section: "demographic",
        text: "Do you identify as transgender?",
        type: "multiple-choice",
        options: [
          "No",
          "Yes",
          "I'd rather not say"
        ],
      },
      {
        section: "demographic",
        text: "Are you a first-generation college student?",
        type: "boolean",
      },
      {
        section: "demographic",
        text: "Are you a Computer Science major?",
        type: "boolean",
      },
      {
        section: "demographic",
        text: "If you stated that you are not a Computer Science major, please indicate your major",
        type: "text",
      },

      // Belonging Questions - Membership
      {
        section: "belonging",
        subsection: "membership",
        text: "I feel that I belong to the computer science community",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "membership",
        text: "I consider myself a member of the computer science world",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "membership",
        text: "I feel like I am part of the computer science community",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "membership",
        text: "I feel a connection with the computer science community",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },

      // Belonging Questions - Acceptance (Positive)
      {
        section: "belonging",
        subsection: "acceptance_positive",
        text: "I feel accepted",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "acceptance_positive",
        text: "I feel respected by my peers and instructors",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "acceptance_positive",
        text: "I feel valued in the classroom environment",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "acceptance_positive",
        text: "I feel appreciated for my contributions",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },

      // Belonging Questions - Acceptance (Negative)
      {
        section: "belonging",
        subsection: "acceptance_negative",
        text: "I feel disregarded",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "acceptance_negative",
        text: "I feel neglected by my peers or instructors",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "acceptance_negative",
        text: "I feel excluded from group activities or discussions",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "acceptance_negative",
        text: "I feel insignificant in this course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      // Emotional Responses (Affect)
      {
        section: "belonging",
        subsection: "emotional_response",
        text: "I feel at ease when participating in this course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "emotional_response",
        text: "I feel anxious about my performance in this class",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "emotional_response",
        text: "I feel comfortable asking questions in lectures, labs and contributing to discussions",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "emotional_response",
        text: "I feel tense during class activities or exams",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "emotional_response",
        text: "I feel calm in the learning environment",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },

      // Trust in Instructors
      {
        section: "belonging",
        subsection: "trust_in_instructors",
        text: "Even when I do poorly, I trust my instructors to have faith in my potential",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "trust_in_instructors",
        text: "I trust my instructors to be committed to helping me learn",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "trust_in_instructors",
        text: "I believe I don’t have to constantly prove myself to succeed in this course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "trust_in_instructors",
        text: "I trust that the testing and grading materials are unbiased",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "trust_in_instructors",
        text: "I feel supported by the instructor in this course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "belonging",
        subsection: "trust_in_instructors",
        text: "I enjoy the content and structure of the course.",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },

      // Course-Specific Questions
      {
        section: "course_specific",
        text: "I feel confident in my ability to understand programming concepts taught in this course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I have previous experience in programming before taking this course",
        type: "multiple-choice",
        options: [
          "Formal coursework (high school/other college)",
          "Self-taught (online tutorials, personal projects)",
          "Both formal and self-taught",
          "No prior experience"
        ],
      },
      {
        section: "course_specific",
        text: "I expect to perform well on the assignments and exams in this course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I believe I can solve complex programming problems in Python, even if they require effort and time",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I feel comfortable understanding Python concepts like loops, conditionals, and functions",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I am comfortable using development tools (IDEs, text editors) for Python programming",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I feel comfortable asking questions during class or seeking help from classmates and instructors",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I believe I will be successful in this course based on the way the material is presented",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I feel prepared to handle the programming assignments and tasks required in this Python course",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },
      {
        section: "course_specific",
        text: "I expect to encounter challenges in this course, but I believe there is enough support available (e.g., from instructors, peers, or resources)",
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"],
      },

      // Parsons Problem Questions
      {
        section: "parsons",
        text: "Rearrange the following code blocks to define a function that adds two numbers and then use the function to add the numbers 5 and 10.",
        type: "parsons-problem",
        options: [
          "return total",
          "total = a + b",
          "a = 5",
          "my_add(a, b)",
          "def my_add(a, b):",
          "b = 10"
        ],
        correctOrder: [
          "def my_add(a,b):",
          "total = a+b",
          "return total",
          "a = 5",
          "b = 10",
          "my_add(a,b)"
        ],
        required: true
      },
      {
        section: "parsons",
        text: "Rearrange the following code blocks to create a Python program that calculates the area of a rectangle. The width of the rectangle is 5 units and the height is 10 units.",
        type: "parsons-problem",
        options: [
          "area = width * height",
          "width = 5",
          "height = 10",
          "print('The area of the rectangle is: ', area)"
        ],
        correctOrder: [
          "width = 5",
          "height = 10",
          "area = width * height",
          "print('The area of the rectangle is: ', area)"
        ],
        required: true
      },
      {
        section: "parsons",
        text: "Rearrange the following code blocks to implement a Python program that checks if a number is positive, negative, or zero. The number to test is -3.",
        type: "parsons-problem",
        options: [
          "print('Positive')",
          "number = -3",
          "elif number == 0:",
          "else:",
          "print('Zero')",
          "if number > 0:",
          "print('Negative')"
        ],
        correctOrder: [
          "number = -3",
          "if number > 0:",
          "print('Positive')",
          "elif number == 0:",
          "print('Zero')",
          "else:",
          "print('Negative')"
        ],
        required: true
      },      

      // Feedback
      {
        section: "feedback",
        text: "Is there anything we could improve in terms of the study procedure or instructions?",
        type: "text",
      },
      {
        section: "feedback",
        text: "Were there any aspects of the study you found challenging or uncomfortable? Please explain.",
        type: "text",
      },
      {
        section: "feedback",
        text: "Do you have any suggestions for improving the experience of wearing the EEG cap?",
        type: "text",
      },
      {
        section: "feedback",
        text: "Were there any parts of the study you particularly enjoyed or found interesting? If so, please share.",
        type: "text",
      },
      {
        section: "feedback",
        text: "Please feel free to share any additional comments or feedback about your overall experience.",
        type: "text",
      },

    ].map((question, index) => ({ ...question, id: index + 1 }));