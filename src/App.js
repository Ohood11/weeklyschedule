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
    availableDays: [],
  });

  const [schedule, setSchedule] = useState({});
  const [selectedClass, setSelectedClass] = useState('S1A');
  const [selectedDays, setSelectedDays] = useState([]);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'P.E', 'ICT', 'ENT', 'Arabic',
    'Kiswahili', 'Luganda', 'Literature', 'ART'
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

  const S1andS2timePeriods = [
    { id: 1, time: '7:20 AM - 8:40 AM' },
    { id: 2, time: '8:40 AM - 10:00 AM' },
    { id: 3, time: '10:20 AM - 11:40 AM' },
    { id: 4, time: '11:40 AM - 12:20 PM' },
    { id: 5, time: '12:20 PM - 1:00 PM' },
    { id: 6, time: '2:00 PM - 2:40 PM' },
    { id: 7, time: '2:40 PM - 3:20 PM' },
    { id: 8, time: '3:20 PM - 4:40 PM' }
  ];

  // Regular time periods for other classes
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
    return className.startsWith('S1') || className.startsWith('S2') 
      ? S1andS2timePeriods 
      : regularTimePeriods;
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
    if (newTeacher.name && newTeacher.subject && selectedDays.length > 0) {
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
        availableDays: [] 
      });
      setSelectedDays([]);
    }
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
      dailyClassAssignments: {}
    }));

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
      
      days.forEach(day => {
        timePeriods.forEach(period => {
          const availableTeachers = teacherAssignments
            .filter(teacher => 
              teacher.classes.includes(classLevel) && 
              teacher.periodsAssigned < targetPeriodsPerTeacher * 1.2 &&
              (!teacher.dailyAssignments[day] || teacher.dailyAssignments[day] < 4) &&
              teacher.availableDays.includes(day) &&
              (!teacher.dailyClassAssignments[day]?.includes(className))
            )
            .sort((a, b) => {
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
              }
            };
            
            newSchedule[className][day][period.id] = {
              teacher: selectedTeacher.name,
              subject: selectedTeacher.subject,
              time: period.time
            };
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
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const timePeriods = getTimePeriodsForClass(selectedClass);
    
    doc.setProperties({
      title: `${selectedClass} - Weekly Schedule`,
      subject: 'School Timetable',
      creator: 'TimeTable Scheduler'
    });
    
    doc.setFontSize(16);
    doc.text(`Class ${selectedClass} - Weekly Schedule`, 15, 15);
    
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
      startY: 25,
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        lineColor: 40,
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
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
    
    doc.save(`${selectedClass}_schedule.pdf`);
  };


  return (
    <div className="timetable-container">
      <div className="management-card">
        <div className="management-header">
          <div className="header-content">
            <h2 className="header-title">Teacher Management (Total: {teachers.length}/60)</h2>
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
              disabled={!newTeacher.name || !newTeacher.subject || selectedDays.length === 0}
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
                  <div className="teacher-classes">Classes: {teacher.classes.join(', ')}</div>
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
                            <div className="teacher-name">
                              {schedule[selectedClass][day][period.id].teacher}
                            </div>
                            <div className="subject-name">
                              {schedule[selectedClass][day][period.id].subject}
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
