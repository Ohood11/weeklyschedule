import React, { useState, useEffect } from 'react';
import { Plus, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './TimeTable.css';

const TimeTableScheduler = () => {
  const [teachers, setTeachers] = useState([]);
  const [newTeacher, setNewTeacher] = useState({ 
    name: '', 
    subject: '', 
    classes: [],
    streams: [], 
    availableDays: [],
  });

  const [schedule, setSchedule] = useState({});
  const [selectedClass, setSelectedClass] = useState('S5A');
  const [selectedDays, setSelectedDays] = useState([]);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'P.E', 'ICT', 'ENT', 'Arabic',
    'Kiswahili', 'Luganda', 'Literature', 'ART', 'Theology', 'General Paper', 'Economics', 'SubMath'
  ];

  useEffect(() => {
    const savedTeachers = localStorage.getItem('schoolTeachers');
    if (savedTeachers) {
      setTeachers(JSON.parse(savedTeachers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('schoolTeachers', JSON.stringify(teachers));
  }, [teachers]);

  const regularTimePeriods = [
    { id: 1, time: '7:20 AM - 8:40 AM' },
    { id: 2, time: '8:40 AM - 10:00 AM' },
    { id: 3, time: '10:20 AM - 11:40 AM' },
    { id: 4, time: '11:40 AM - 1:00 PM' },
    { id: 5, time: '2:00 PM - 3:20 PM' },
    { id: 6, time: '3:20 PM - 4:40 PM' }
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const classes = [
    ...['S1', 'S2'].flatMap(level => ['A', 'B', 'C'].map(stream => `${level}${stream}`)),
    ...['S3', 'S4'].flatMap(level => ['A', 'B', 'C'].map(stream => `${level}${stream}`)),
    ...['S5', 'S6'].flatMap(level => ['A', 'B'].map(stream => `${level}${stream}`))
  ];

  const getTimePeriodsForClass = (className) => {
    return regularTimePeriods;
  };

  const handleDayToggle = (day) => {
    setSelectedDays(prevDays => {
      if (prevDays.includes(day)) {
        return prevDays.filter(d => d !== day);
      } else {
        return [...prevDays, day].sort((a, b) => days.indexOf(a) - days.indexOf(b));
      }
    });
  };

  const addTeacher = () => {
    if (!newTeacher.name) {
      alert('Please enter a teacher name.');
      return;
    }
    if (!newTeacher.subject) {
      alert('Please select a subject.');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Please select at least one available day.');
      return;
    }
    if (newTeacher.classes.some(c => c === 'S5' || c === 'S6') && newTeacher.streams.length === 0) {
      alert('Please select at least one stream for S5 and S6 classes.');
      return;
    }
  
    setTeachers([...teachers, { 
      ...newTeacher, 
      availableDays: [...selectedDays],
      periodsAssigned: 0,
      id: teachers.length + 1
    }]);
    setNewTeacher({ 
      name: '', 
      subject: '', 
      classes: [], 
      streams: [], 
      availableDays: [] 
    });
    setSelectedDays([]);
  };

  const removeTeacher = (index) => {
    const updatedTeachers = teachers.filter((_, i) => i !== index);
    setTeachers(updatedTeachers);
  };

  const generateSchedule = () => {
  const newSchedule = {};
  let teacherAssignments = teachers.map(teacher => ({
    ...teacher,
    periodsAssigned: 0,
    dailyAssignments: {},
    dailyClassAssignments: {},
    quadralsAssigned: 0,
    doublesAssigned: 0
  }));

  const scienceSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography'];
  const artsSubjects = subjects.filter(subject => !scienceSubjects.includes(subject));
  const optionalSubjects = ['P.E', 'ART', 'ICT', 'ENT', 'Kiswahili', 'Luganda', 'Literature', 'Arabic', 'Economics', 'SubMath'];

  const scienceQuadralsPerWeek = 3;
  const scienceDoublesPerWeek = 2;
  const artsQuadralsPerWeek = 2;
  const artsDoublesPerWeek = 2;
  const minDoublesPerWeek = 3;
  const subsidiaryQuadralsPerWeek = 2;
  const subsidiaryPeriodsPerWeek = 1;

  classes.forEach(className => {
    const timePeriods = getTimePeriodsForClass(className);
    const totalPeriodsPerWeek = days.length * timePeriods.length;
    const targetPeriodsPerTeacher = Math.floor(totalPeriodsPerWeek / teachers.length);

    newSchedule[className] = {};
    days.forEach(day => {
      newSchedule[className][day] = {};
      timePeriods.forEach(period => {
        newSchedule[className][day][period.id] = {
          teacher: 'Unassigned',
          subject: '-',
          time: period.time
        };
      });
    });

    const classLevel = className.substring(0, 2);
    const stream = className.substring(2); 
    
    days.forEach(day => {
      timePeriods.forEach(period => {
        let availableTeachers = teacherAssignments.filter(teacher => {
          if (classLevel === 'S5' || classLevel === 'S6') {
            if (teacher.classes.includes(classLevel) && 
                teacher.streams.includes(stream) && 
                teacher.periodsAssigned < targetPeriodsPerTeacher * 1.2 &&
                (!teacher.dailyAssignments[day] || teacher.dailyAssignments[day] < 4) &&
                teacher.availableDays.includes(day) &&
                (!teacher.dailyClassAssignments[day]?.includes(className))) {
              if (scienceSubjects.includes(teacher.subject)) {
                // Ensure quadrals and doubles for science subjects
                if (teacher.quadralsAssigned < scienceQuadralsPerWeek && period.id % 2 === 1 && period.id < 6) {
                  return true;
                } else if (teacher.doublesAssigned < scienceDoublesPerWeek && period.id % 2 === 1) {
                  return true;
                }
              } else if (artsSubjects.includes(teacher.subject)) {
                // Ensure quadrals and doubles for arts subjects
                if (teacher.quadralsAssigned < artsQuadralsPerWeek && period.id % 2 === 1 && period.id < 6) {
                  return true;
                } else if (teacher.doublesAssigned < artsDoublesPerWeek && period.id % 2 === 1) {
                  return true;
                }
              } else if (optionalSubjects.includes(teacher.subject)) {
                // Ensure fewer periods for optional subjects
                if (teacher.periodsAssigned < targetPeriodsPerTeacher * 0.7) {
                  return true;
                }
              } else if (teacher.subject === 'General Paper') {
                // Ensure General Paper is compulsory and has a quadral
                if (teacher.quadralsAssigned < 1 && period.id % 2 === 1 && period.id < 6) {
                  return true;
                }
              } else if (teacher.subject === 'SubMath' || teacher.subject === 'ICT') {
                // Ensure SubMath and ICT are scheduled at the same time and have two quadrals and one period
                if (teacher.quadralsAssigned < subsidiaryQuadralsPerWeek && period.id % 2 === 1 && period.id < 6) {
                  return true;
                } else if (teacher.periodsAssigned < subsidiaryPeriodsPerWeek && period.id % 2 === 1) {
                  return true;
                }
              }
              return true;
            }
            return false;
          } else if (classLevel === 'S1' || classLevel === 'S2') {
            if (teacher.classes.includes(classLevel) && 
                teacher.periodsAssigned < targetPeriodsPerTeacher * 1.2 &&
                (!teacher.dailyAssignments[day] || teacher.dailyAssignments[day] < 4) &&
                teacher.availableDays.includes(day) &&
                (!teacher.dailyClassAssignments[day]?.includes(className))) {
              if (scienceSubjects.includes(teacher.subject)) {
                // Give more time to science subjects
                if (period.id % 2 === 1) {
                  return true;
                }
              } else if (artsSubjects.includes(teacher.subject)) {
                // Give more time to arts subjects
                if (period.id % 2 === 1) {
                  return true;
                }
              } else if (optionalSubjects.includes(teacher.subject)) {
                // Treat optional subjects as compulsory in S1 and S2
                if (period.id % 2 === 1) {
                  return true;
                }
              }
              return true;
            }
            return false;
          } else {
            if (teacher.classes.includes(classLevel) && 
                teacher.periodsAssigned < targetPeriodsPerTeacher * 1.2 &&
                (!teacher.dailyAssignments[day] || teacher.dailyAssignments[day] < 4) &&
                teacher.availableDays.includes(day) &&
                (!teacher.dailyClassAssignments[day]?.includes(className))) {
              if (scienceSubjects.includes(teacher.subject)) {
                // Give more time to science subjects
                if (period.id % 2 === 1) {
                  return true;
                }
              } else if (artsSubjects.includes(teacher.subject)) {
                // Give more time to arts subjects
                if (period.id % 2 === 1) {
                  return true;
                }
              } else if (optionalSubjects.includes(teacher.subject)) {
                // Ensure fewer periods for optional subjects in S3 and above
                if (teacher.periodsAssigned < targetPeriodsPerTeacher * 0.7) {
                  return true;
                }
              }
              return true;
            }
            return false;
          }
        }).sort((a, b) => {
          const aLoad = a.periodsAssigned + (a.dailyAssignments[day] || 0);
          const bLoad = b.periodsAssigned + (b.dailyAssignments[day] || 0);
          return aLoad - bLoad;
        });

        if (availableTeachers.length > 0) {
          const selectedTeacher = availableTeachers[0];
          const teacherIndex = teacherAssignments.findIndex(t => t.id === selectedTeacher.id);
          
          teacherAssignments[teacherIndex] = {
            ...selectedTeacher,
            periodsAssigned: selectedTeacher.periodsAssigned + 1,
            dailyAssignments: {
              ...selectedTeacher.dailyAssignments,
              [day]: (selectedTeacher.dailyAssignments[day] || 0) + 1
            },
            dailyClassAssignments: {
              ...selectedTeacher.dailyClassAssignments,
              [day]: [...(selectedTeacher.dailyClassAssignments[day] || []), className]
            },
            quadralsAssigned: period.id % 2 === 1 && period.id < 6 ? selectedTeacher.quadralsAssigned + 1 : selectedTeacher.quadralsAssigned,
            doublesAssigned: period.id % 2 === 1 ? selectedTeacher.doublesAssigned + 1 : selectedTeacher.doublesAssigned
          };
          
          newSchedule[className][day][period.id] = {
            teacher: selectedTeacher.name,
            subject: selectedTeacher.subject,
            time: period.time
          };

          // Handle Geography in both streams
          if (selectedTeacher.subject === 'Geography' && (classLevel === 'S5' || classLevel === 'S6')) {
            const otherStream = stream === 'A' ? 'B' : 'A';
            const otherClassName = `${classLevel}${otherStream}`;
            newSchedule[otherClassName][day][period.id] = {
              teacher: selectedTeacher.name,
              subject: selectedTeacher.subject,
              time: period.time
            };
          }

          // Handle General Paper in both streams
          if (selectedTeacher.subject === 'General Paper' && (classLevel === 'S5' || classLevel === 'S6')) {
            const otherStream = stream === 'A' ? 'B' : 'A';
            const otherClassName = `${classLevel}${otherStream}`;
            newSchedule[otherClassName][day][period.id] = {
              teacher: selectedTeacher.name,
              subject: selectedTeacher.subject,
              time: period.time
            };
          }

          // Handle SubMath and ICT at the same time in both streams
          if (selectedTeacher.subject === 'SubMath' || selectedTeacher.subject === 'ICT') {
            const otherSubject = selectedTeacher.subject === 'SubMath' ? 'ICT' : 'SubMath';
            const otherStream = stream === 'A' ? 'B' : 'A';
            const otherClassName = `${classLevel}${otherStream}`;
            newSchedule[otherClassName][day][period.id] = {
              teacher: selectedTeacher.name,
              subject: otherSubject,
              time: period.time
            };
          }
        }
      });
    });
  });

  setTeachers(teachers.map(teacher => {
    const updatedTeacher = teacherAssignments.find(t => t.id === teacher.id);
    return {
      ...teacher,
      periodsAssigned: updatedTeacher ? updatedTeacher.periodsAssigned : 0
    };
  }));
  setSchedule(newSchedule);
  alert('Schedule generated successfully!');
};

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const timePeriods = getTimePeriodsForClass(selectedClass);
    
    doc.setProperties({
      title: `${selectedClass} - Weekly Schedule`,
      subject: 'School Timetable',
      creator: 'Kinaawa High School'
    });
  
    doc.setFontSize(18);
    doc.setTextColor(26, 71, 42); 
    doc.text('KINAAWA HIGH SCHOOL', 148, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('KAWEMPE CAMPUS', 148, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102); 
    doc.text('P.O. Box 9093,', 15, 35);
    doc.text('Kampala-Uganda', 15, 40);
    doc.text('Bombo Road - Kawempe Ttula', 15, 45);
    
    doc.text('Tel:+256(0)772 431975', 230, 35, { align: 'right' });
    doc.text('+256(0)759 137103', 230, 40, { align: 'right' });
    
    doc.text('E-mail: kinaawa kawempe@gmail.com', 15, 50);
    
    doc.setDrawColor(26, 71, 42);
    doc.line(15, 52, 280, 52);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class ${selectedClass} - Weekly Schedule`, 15, 65);
    
    const tableData = timePeriods.map(period => {
      return [
        period.time,
        ...days.map(day => {
          const slot = schedule[selectedClass][day][period.id];
          return `${slot.teacher}\n${slot.subject}`;
        })
      ];
    });
    
    const headers = ['Time/Day', ...days];
    
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 65,
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        lineColor: 40,
        lineWidth: 0.1,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [26, 71, 42],
        textColor: 255,
        fontSize: 20,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      theme: 'grid'
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const today = new Date().toLocaleDateString();
      doc.text(`Generated on: ${today}`, 15, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`${selectedClass}_schedule.pdf`);
    alert('PDF exported successfully!');
  };

  const [editingTeacher, setEditingTeacher] = useState(null);

  const startEdit = (index) => {
    const teacher = teachers[index];
    setNewTeacher({
      name: teacher.name,
      subject: teacher.subject,
      classes: teacher.classes,
      streams: teacher.streams,
      availableDays: teacher.availableDays
    });
    setEditingTeacher(index);
  };

  const updateTeacher = () => {
    if (editingTeacher !== null) {
      const updatedTeachers = [...teachers];
      updatedTeachers[editingTeacher] = {
        ...newTeacher,
        id: updatedTeachers[editingTeacher].id,
        periodsAssigned: updatedTeachers[editingTeacher].periodsAssigned
      };
      setTeachers(updatedTeachers);
      setEditingTeacher(null);
      setNewTeacher({
        name: '',
        subject: '',
        classes: [],
        streams: [],
        availableDays: []
      });
      setSelectedDays([]);
      alert('Teacher updated successfully!');
    }
  };

  return (
    <div className="timetable-container">
      <div className="management-card">
        <div className="management-header">
          <div className="header-content">
            <h2 className="header-title">Teacher Management (Total: {teachers.length})</h2>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure about clearing all teachers?')) {
                  setTeachers([]);
                  localStorage.removeItem('schoolTeachers');
                }
              }}
              className="clear-button"
            >
              Clear All Teachers
            </button>
          </div>
        </div>
  
        <div className="input-container">
          <div className="input-row">
            <input
              type="text"
              placeholder="Teacher Name"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
              className="input-field"
            />
            <select
              value={newTeacher.subject}
              onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
              className="input-field"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              multiple
              value={newTeacher.classes} 
              onChange={(e) => setNewTeacher({
                ...newTeacher,
                classes: Array.from(e.target.selectedOptions, option => option.value)
              })}
              className="input-field"
            >
              {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>

            {newTeacher.classes.some(c => c === 'S5' || c === 'S6') && (
              <select
                multiple
                value={newTeacher.streams}
                onChange={(e) => setNewTeacher({
                  ...newTeacher,
                  streams: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="input-field"
              >
                <option value="A">Arts A</option>
                <option value="B">sciences B</option>
              </select>
            )}
            
            <div className="days-toggle-container">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`day-toggle ${selectedDays.includes(day) ? 'day-selected' : ''}`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
  
            <button 
              onClick={addTeacher}
              disabled={
                !newTeacher.name || 
                !newTeacher.subject || 
                selectedDays.length === 0 ||
                (newTeacher.classes.some(c => c === 'S5' || c === 'S6') && newTeacher.streams.length === 0)
              }
              className="add-button"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
            </button>
          </div>
  
          <div className="teacher-list">
            {teachers.map((teacher, index) => (
              <div key={index} className="teacher-card">
                <div className="teacher-info">
                  <div className="teacher-name">{teacher.name}</div>
                  <div className="teacher-subject">{teacher.subject}</div>
                  <div className="teacher-classes">
                    Classes: {teacher.classes.join(', ')}
                    {(teacher.classes.includes('S5') || teacher.classes.includes('S6')) && 
                      ` ( ${teacher.streams.join(', ')})`
                    }
                  </div>
                  <div className="teacher-periods">Available: {teacher.availableDays.join(', ')}</div>
                  {teacher.periodsAssigned > 0 && (
                    <div className="teacher-periods">Periods: {teacher.periodsAssigned}</div>
                  )}
                </div>
                <button
                  onClick={() => removeTeacher(index)}
                  className="remove-button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
  
          {teachers.length > 0 && (
            <button 
              onClick={generateSchedule}
              className="generate-button"
            >
              Generate Weekly Schedule
            </button>
          )}
        </div>
      </div>
  
      {Object.keys(schedule).length > 0 && (
        <div className="schedule-card">
          <div className="schedule-header">
            <h2 className="header-title">Weekly Schedule</h2>
            <div className="class-buttons">
              {classes.map(className => (
                <button
                  key={className}
                  onClick={() => setSelectedClass(className)}
                  className={`class-button ${
                    selectedClass === className 
                      ? 'class-button-active' 
                      : 'class-button-inactive'
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          </div>
          <div className="schedule-table-container">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th className="table-header">Time/Day</th>
                  {days.map(day => (
                    <th key={day} className="table-header">{day}</th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {getTimePeriodsForClass(selectedClass).map(period => (
                  <tr key={period.id}>
                    <td className="table-cell time-cell">{period.time}</td>
                    {days.map(day => (
                      <td key={day} className="table-cell">
                        {schedule[selectedClass]?.[day]?.[period.id]?.teacher && (
                          <div className="period-info">
                            <div className="subject-name">
                              {schedule[selectedClass][day][period.id].subject}
                            </div>
                            <div className="teacher">
                              {schedule[selectedClass][day][period.id].teacher}
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={exportToPDF}
              className="add-button"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTableScheduler;
