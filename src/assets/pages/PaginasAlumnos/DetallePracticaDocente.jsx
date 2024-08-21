import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Components from '../../components/Components';
import { Tooltip } from 'flowbite-react';
import { useAuth } from '../../server/authUser';
import { FaEdit, FaSave, FaTimes, FaPlus, FaTrash} from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { Tabs } from "flowbite-react";
import { MdDescription, MdAssignment } from "react-icons/md";
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { FixedSizeList as List } from 'react-window';
import 'react-quill/dist/quill.snow.css';

const { TitlePage, Paragraphs, TitleSection, LoadingButton, CustomInputOnchange, ContentTitle, FloatingLabelInput } = Components;

const DetallePracticaDocente = () => {
    const { intNumeroPractica } = useParams();
    const [detalleActividad, setDetalleActividad] = useState({});
    const { isAuthenticated, userData } = useAuth();
    const [rubricaData, setRubricaData] = useState([]);
    const [rubricaCalAlumno, setRubricaCalAlumno] = useState([]);
    const [puntajeTotal, setPuntajeTotal] = useState(0);
    const [puntajeTotalCal, setPuntajeTotalCal] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState([]);
    const [alumnos, setAlumnosMaterias] = useState([]);
    const {vchClvMateria, chrGrupo, intPeriodo } = useParams();
    const [selectedAlumnoMatricula, setSelectedAlumnoMatricula] = useState(null);
    const [selectedAlumno, setSelectedAlumno] = useState(null);
    const [puntajeObtenido, setPuntajeObtenido] = useState(0);

    const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm();

    const validatePuntajeTotal = (data) => {
        return data.reduce((sum, rubrica) => sum + (parseInt(rubrica.intValor) || 0), 0) <= 10;
    };

    const handleEditClick = () => {
        setEditedData([...rubricaData]);
        setIsEditing(true);
    };

    const handleSaveClick = async () => {
        if (!validatePuntajeTotal(editedData)) {
        alert('El puntaje total no puede exceder de 10 puntos.');
        return;
        }
        console.log("datos rubrica",editedData);
        try {
        const response = await fetch('https://robe.host8b.me/WebServices/cargarMaterias.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updatedRubrica: editedData }),
        });
        const data = await response.json();

        if (data.done) {
            setRubricaData(editedData);
            localStorage.setItem('rubricaData', JSON.stringify(editedData));
            setIsEditing(false);
        } else {
            console.error('Error al actualizar la rúbrica');
        }
        } catch (error) {
        console.error('Error:', error.message);
        }
    };

    const handleCancelClick = () => {
        const storedData = localStorage.getItem('rubricaData');
        if (storedData) {
        const parsedData = JSON.parse(storedData);
        setEditedData(parsedData);
        setRubricaData(parsedData);
        } else {
        setEditedData([...rubricaData]);
        }
        setIsEditing(false);
    };
    

    const handleInputChange = (index, field, value) => {
        const newEditedData = [...editedData];
        newEditedData[index][field] = value;
        setEditedData(newEditedData);
    };


    const handleInputChangeCal = (index, field, value) => {
        const newValue = parseFloat(value) || 0;
        const updatedRubricas = rubricaCalAlumno.map((rubrica, i) => {
            if (i === index) {
                // Validar que el valor no exceda el valor máximo
                const validValue = newValue <= rubrica.valorMaximo ? newValue : rubrica.valorMaximo;
                return { ...rubrica, [field]: validValue };
            }
            return rubrica;
        });
    
        setRubricaCalAlumno(updatedRubricas);
    
        // Calcular el puntaje total y el puntaje obtenido
        const totalMaximo = updatedRubricas.reduce((acc, rubrica) => acc + rubrica.valorMaximo, 0);
        const totalObtenido = updatedRubricas.reduce((acc, rubrica) => acc + (parseFloat(rubrica.calificacionObtenida) || 0), 0);
    
        setPuntajeTotalCal(totalMaximo);
        setPuntajeObtenido(totalObtenido);
    };
    
    
    useEffect(() => 
    {
        if (selectedAlumnoMatricula) {
            fetchCalificacionesAlumno(selectedAlumnoMatricula);
        }
    }, [selectedAlumnoMatricula]);
    
    const fetchCalificacionesAlumno = async (matricula) => {
        try {
            const response = await fetch('https://robe.host8b.me/WebServices/accionesAlumnos.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    idPractica: intNumeroPractica,
                    alumnoMatricula: matricula 
                }),
            });
            const result = await response.json();
            console.log(result);
            if (result.done) {
                // Inicializar cada rubro con su valor máximo si aún no tiene calificación
                const initializedRubrica = result.message.map(rubrica => ({
                    ...rubrica,
                    calificacionObtenida: rubrica.calificacionObtenida === null ? rubrica.valorMaximo : rubrica.calificacionObtenida
                }));
    
                setRubricaCalAlumno(initializedRubrica);
            } else {
                console.error('Error al cargar las calificaciones del alumno:', result.message);
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    };
    
    const handleCalificarClick = async () => {
        if (!selectedAlumnoMatricula) {
        alert('Selecciona un alumno antes de calificar.');
        return;
        }
        console.log(rubricaCalAlumno)

        try {
        const response = await fetch('https://robe.host8b.me/WebServices/accionesAlumnos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            practicaId: intNumeroPractica,
            calificacionRubrica: puntajeObtenido,
            alumnoMatricula: selectedAlumnoMatricula,
            calificaciones: rubricaCalAlumno,
            }),
        });
        const result = await response.json();
    
        if (result.done) {
            onloadAlumnos()
            alert('Calificaciones actualizadas exitosamente');
        } else {
            console.error('Error al calificar:', result.message);
        }
        } catch (error) {
        console.error('Error:', error.message);
        }
    };
    
    const onloadAlumnos = async () => {
        try {
        const response = await fetch('https://robe.host8b.me/WebServices/accionesAlumnos.php', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            clvMateria: vchClvMateria,
            matriculaDocent: userData.vchMatricula,
            chrGrupo: chrGrupo,
            periodo: intPeriodo,
            practicaId: intNumeroPractica, // Asegúrate de tener el idPractica en el contexto adecuado

            }),
        });
        const result = await response.json();
        console.log("alumnos calificados", result)
        if (result.done) {
            setAlumnosMaterias(result.message);
        } else {
            console.error('Error en el registro:', result.message);
            if (result.debug_info) {
            console.error('Información de depuración:', result.debug_info);
            }
            if (result.errors) {
            result.errors.forEach(error => {
                console.error('Error específico:', error);
            });
            }
        }
        } catch (error) {
        console.error('Error 500', error);
        setTimeout(() => {
            alert('¡Ay caramba! Encontramos un pequeño obstáculo en el camino, pero estamos trabajando para superarlo. Gracias por tu paciencia mientras solucionamos este problemita.');
        }, 2000);
        }
    };
    useEffect(() => {
        onloadAlumnos();
    }, [vchClvMateria, userData.vchMatricula, chrGrupo, intPeriodo, intNumeroPractica]);
    
    useEffect(() => {
        const fetchActividad = async () => {
        const requestData = { idPracticaDetalle: intNumeroPractica };
        try {
            const response = await fetch('https://robe.host8b.me/WebServices/cargarMaterias.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
            });
            const data = await response.json();
            console.log("datos rubrica: ", data);
            if (data.done) {
            setDetalleActividad(data.message.detallePractica);
            const fetchedRubricaData = data.message.detalleRubrica;
            setRubricaData(fetchedRubricaData);
            localStorage.setItem('rubricaData', JSON.stringify(fetchedRubricaData));
            setEditedData(fetchedRubricaData);
            } else {
            throw new Error('Error al cargar los datos de la actividad');
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
        };

        fetchActividad();
    }, [intNumeroPractica]);


    const handleAlumnoSelect = (matricula) => {
        setSelectedAlumno(alumnos.find(alumno => alumno.AlumnoMatricula === matricula));
        setSelectedAlumnoMatricula(matricula);
    };
    

    useEffect(() => {
        const dataToSum = isEditing ? editedData : rubricaData;
        const total = dataToSum.reduce((sum, rubrica) => sum + (parseFloat(rubrica.intValor) || 0), 0);
        setPuntajeTotal(total);
    }, [rubricaData, editedData, isEditing]);

    useEffect(() => {
        const totalMaximo = rubricaCalAlumno.reduce((acc, rubrica) => acc + rubrica.valorMaximo, 0);
        const totalObtenido = rubricaCalAlumno.reduce((acc, rubrica) => acc + (parseFloat(rubrica.calificacionObtenida) || 0), 0);
        setPuntajeTotalCal(totalMaximo);
        setPuntajeObtenido(totalObtenido);
    }, [rubricaCalAlumno]);


    const Row = ({ index, style, data }) => {
        const alumno = data[index];
        return (
            <div
                className={`flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${alumno.TieneCalificacion ? 'text-green-500' : 'text-red-500'}`}
                style={style}
                onClick={() => handleAlumnoSelect(alumno.AlumnoMatricula)}
            >
                <Paragraphs
                    label={`${alumno.AlumnoMatricula} ${alumno.AlumnoNombre} ${alumno.AlumnoApellidoPaterno} ${alumno.AlumnoApellidoMaterno}`}
                />

                {alumno.TieneCalificacion ? (
                    <FaCheckCircle className="ml-2 text-lg" />
                ) : (
                    <FaTimesCircle className="ml-2 text-lg" />
                )}
            </div>
        );
    };

    const AlumnosList = ({ alumnos, handleAlumnoSelect }) => {
        return (
            <List
                height={400}           // Altura de la lista visible (en píxeles)
                itemCount={alumnos.length} // Número total de elementos en la lista
                itemSize={60}          // Altura de cada fila (en píxeles)
                width={'100%'}         // Ancho de la lista (puede ser un valor fijo o 100% del contenedor)
                itemData={{ alumnos, handleAlumnoSelect }} // Datos pasados a cada fila
            >
                {({ index, style }) => (
                    <Row index={index} style={style} data={alumnos} />
                )}
            </List>
        );
    };

    const handleAddRubro = () => {
        const newRubro = {
          // Otros campos necesarios para el rubro
        };
        setEditedData([...editedData, newRubro]);
    };

    // Función para eliminar un rubro por índice
    const handleDeleteRubro = (index) => {
        const updatedData = editedData.filter((_, i) => i !== index);
        setEditedData(updatedData);
    };

    return (
        <section className='w-full flex flex-col'>
        <TitlePage label={detalleActividad.vchNombre} />
        <Paragraphs className="ml-3" label={detalleActividad.vchDescripcion} />
        <Tabs>
            <Tabs.Item title="Instrucciones" icon={MdDescription}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className='md:w-full md:flex flex-col gap-y-4'>
                        <div className="mb-4 md:mb-0 rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
                            <TitleSection label="Instrucciones" />
                            <div className="prose"
                                dangerouslySetInnerHTML={{ __html: detalleActividad.vchInstrucciones }} />
                            </div>
                            <div className="grid grid-cols-1 gap-1 md:mb-0 rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
                                <div className="flex justify-between items-center">
                                <TitleSection label="Rúbrica de Evaluación" />
                                
                                {isEditing ? (
                                    <div className="flex gap-2">
                                    <Tooltip content="Guardar" placement="left">
                                        <FaSave className="text-gray-500 hover:text-gray-700 cursor-pointer" onClick={handleSaveClick} />
                                    </Tooltip>
                                    <Tooltip content="Cancelar" placement="left">
                                        <FaTimes className="text-gray-500 hover:text-gray-700 cursor-pointer" onClick={handleCancelClick} />
                                    </Tooltip>
                                    </div>
                                ) : (
                                    <Tooltip content="Editar" placement="left">
                                    <FaEdit className="text-gray-500 hover:text-gray-700 cursor-pointer" onClick={handleEditClick} />
                                    </Tooltip>
                                )}
                                </div>
                                
                                {editedData.map((rubrica, index) => (
                                <div key={index} className="space-y-4">
                                    <div className="grid grid-cols-2 items-center">
                                    <div className="text-muted-foreground">
                                        {isEditing ? (
                                        <CustomInputOnchange
                                            label={`Rubro ${index + 1}`}
                                            type="text"
                                            name={`vchRubro_${index}`}
                                            value={rubrica.vchDescripcion || ''}
                                            errors={errors}
                                            register={register}
                                            trigger={trigger}
                                            onChange={(value) => handleInputChange(index, 'vchDescripcion', value)}
                                        />
                                        ) : (
                                        <p>{rubrica.vchDescripcion}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        {isEditing ? (
                                        <>
                                        <CustomInputOnchange
                                            label={`Valor ${index + 1}`}
                                            type="number"
                                            name={`intValor_${index}`}
                                            value={rubrica.intValor || ''}
                                            pattern={/^[0-9]+$/}
                                            errorMessage="El valor debe ser un número"
                                            errors={errors}
                                            register={register}
                                            trigger={trigger}
                                            onChange={(value) => handleInputChange(index, 'intValor', value)}
                                        />
                                        <Tooltip content="Eliminar rubro">
                                            <button
                                            type="button"
                                            className="text-gray-500  hover:text-gray-700 cursor-pointer"
                                            onClick={() => handleDeleteRubro(index)}
                                            >
                                            <FaTrash />
                                            </button>
                                        </Tooltip>
                                        </>
                                        ) : (
                                        <span className="font-semibold">{rubrica.intValor}</span>
                                        )}
                                        {isAuthenticated && !userData.roles && !isEditing && (
                                        <span className="text-muted-foreground">/{rubrica.intValor}</span>
                                        )}
                                    </div>
                                    </div>
                                </div>
                                ))}
                                {isEditing && (
                                <Tooltip content="Agregar nuevo criterio">
                                    <button
                                        type="button"
                                        className="bg-primary hover:bg-secondary mt-4 flex items-center justify-center p-3 bg-white rounded-full border border-bg-primary hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-300"
                                        onClick={handleAddRubro}
                                    >
                                        <FaPlus className="text-lg" />
                                    </button>
                                </Tooltip>
                                )}

                                <div className="mt-6 flex justify-between items-center">
                                <div className="text-muted-foreground">Puntaje Total</div>
                                <div className="flex items-center gap-2">
                                    {isAuthenticated && !userData.roles && (
                                    <span className="text-muted-foreground">{puntajeTotal}</span>
                                    )}
                                    <span className="font-semibold text-2xl">{puntajeTotal}</span>
                                </div>
                                </div>
                            </div>
                    </div>
                </div>
            </Tabs.Item>
            <Tabs.Item title="Trabajos de los Alumnos" icon={MdAssignment}>
            <div className="flex flex-col md:flex-row gap-4">
                <div className='md:w-5/12 md:flex flex-col gap-y-4'>
                <div className="mb-4 md:mb-0 rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
                    <TitleSection label="Lista de Alumnos Calificados" />
                    {/* Botón de seleccionar el alumno y mandar la matrícula */}
                    {/*{alumnos.map((alumno) => (
                    <div
                        className={`flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${alumno.TieneCalificacion ? 'text-green-500' : 'text-red-500'}`}
                        key={alumno.AlumnoMatricula}
                        onClick={() => handleAlumnoSelect(alumno.AlumnoMatricula)}
                    >
                        <Paragraphs
                        label={`${alumno.AlumnoMatricula} ${alumno.AlumnoNombre} ${alumno.AlumnoApellidoPaterno} ${alumno.AlumnoApellidoMaterno}`}
                        />
                        {alumno.TieneCalificacion ? (
                        <FaCheckCircle className="ml-2 text-lg" />
                        ) : (
                        <FaTimesCircle className="ml-2 text-lg" />
                        )}
                    </div>
                    ))}*/}
                    <AlumnosList alumnos={alumnos} handleAlumnoSelect={handleAlumnoSelect} />
                </div>
                </div>
                <div className="md:w-7/12 md:flex flex-col">
                <div className="h-full rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    {selectedAlumno ? (
                        <>
                        <div className="flex flex-col mb-4 md:mb-0">
                            <TitleSection label="Calificación de Rúbrica" />
                            <ContentTitle label="Alumno seleccionado" />
                            <div className="mt-4">
                                <p><strong>Matricula:</strong> {selectedAlumno.AlumnoMatricula}</p>
                                <p><strong>Nombre:</strong> {selectedAlumno.AlumnoNombre} {selectedAlumno.AlumnoApellidoPaterno} {selectedAlumno.AlumnoApellidoMaterno}</p>
                            </div>
                        </div>
                        <LoadingButton normalLabel="Calificar" className="w-28 h-10 text-white py-2 px-4 rounded-lg" onClick={handleCalificarClick} />
                        </>
                        ) 
                        : 
                        (
                            <ContentTitle className="ml-3" label="Selecciona un alumno"/>
                        )
                    }
                    </div>
                    {rubricaCalAlumno.map((rubrica, index) => (
                    <div key={index} className="space-y-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="text-muted-foreground">
                            <p className="text-sm sm:text-base">{rubrica.criterioDescripcion}</p>
                        </div>
                        <div className="flex items-center justify-end">
                        <CustomInputOnchange
                                label={`Valor ${index + 1}`}
                                type="number"
                                name={`intCal_${index}`}
                                value={rubrica.calificacionObtenida || ''}
                                pattern={/^[0-9]+$/}
                                errorMessage="El valor debe ser un número"
                                errors={errors}
                                register={register}
                                onChange={(value) => handleInputChangeCal(index, 'calificacionObtenida', value||0)}
                            />
                            <span className="font-semibold text-lg sm:text-xl">/{rubrica.valorMaximo}</span>
                        </div>
                        </div>
                    </div>
                    ))}
                    {selectedAlumno && (
                    <div className="mt-6 flex justify-between items-center">
                        <div className="text-muted-foreground">Puntaje Total</div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-2xl">{puntajeObtenido}</span>  
                            <span className="text-muted-foreground">/{puntajeTotalCal}</span>
                        </div>
                    </div>
                    )}
                </div>
                </div>
            </div>
            </Tabs.Item>
        </Tabs>
        </section>
    );
};

export default DetallePracticaDocente;